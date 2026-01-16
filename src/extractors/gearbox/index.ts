import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, http, parseAbi, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { CHAIN_CONFIGS } from '../../config/chains.js'
import { GEARBOX_TBTC_POOLS } from './config.js'

const POOL_V3_ABI = parseAbi([
  'function totalAssets() view returns (uint256)',
  'function asset() view returns (address)'
])

export class GearboxExtractor extends BaseExtractor {
  readonly protocolName = 'Gearbox'
  readonly supportedChains = [Chain.ETHEREUM]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Gearbox extraction for ${chain}`
    )
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const pools = GEARBOX_TBTC_POOLS[chain]
    const chainConfig = CHAIN_CONFIGS[chain]

    if (!pools || pools.length === 0) {
      throw new Error(`Gearbox not configured for chain: ${chain}`)
    }

    const client = createPublicClient({
      chain: mainnet,
      transport: http(chainConfig.rpcUrl, { timeout: this.options.timeout ?? 10000 })
    })

    let totalTvl = 0n

    for (const pool of pools) {
      try {
        const checksummedAddress = getAddress(pool.address)
        const totalAssets = await client.readContract({
          address: checksummedAddress,
          abi: POOL_V3_ABI,
          functionName: 'totalAssets'
        })
        totalTvl += totalAssets
      } catch (error) {
        this.logger.warn({ pool: pool.name, error: error instanceof Error ? error.message : String(error) }, 'Failed to query pool')
      }
    }

    const blockNumber = await client.getBlockNumber()

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      blockNumber: Number(blockNumber),
      metadata: { source: this.source, endpoint: chainConfig.rpcUrl }
    }
  }
}
