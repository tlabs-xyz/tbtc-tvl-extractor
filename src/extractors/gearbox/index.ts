import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, parseAbi, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { CHAIN_CONFIGS, createEvmHttpTransport } from '../../config/chains.js'
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
      transport: createEvmHttpTransport(chain, this.options.timeout ?? 10000)
    })

    let totalTvl = 0n

    const checksummedAddresses = pools.map(p => {
      try {
        return getAddress(p.address)
      } catch {
        return null
      }
    })

    const validPools = pools.filter((_, i) => checksummedAddresses[i] !== null) as typeof pools
    const addresses = checksummedAddresses.filter((a): a is NonNullable<typeof a> => a !== null)

    const results = await client.multicall({
      contracts: addresses.map(addr => ({
        address: addr,
        abi: POOL_V3_ABI,
        functionName: 'totalAssets'
      })),
      allowFailure: true
    })

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const pool = validPools[i]
      if (r.status === 'success') {
        totalTvl += r.result as bigint
      } else {
        this.logger.warn({ pool: pool.name, error: r.error?.message ?? 'multicall failure' }, 'Failed to query pool')
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
