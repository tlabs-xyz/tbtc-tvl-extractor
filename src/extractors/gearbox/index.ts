import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, parseAbi, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { CHAIN_CONFIGS, createEvmHttpTransport, getConfiguredRpcEndpoints } from '../../config/chains.js'
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

    let invalidPoolAddressCount = 0
    const checksummedAddresses = pools.map(p => {
      try {
        return getAddress(p.address)
      } catch {
        invalidPoolAddressCount++
        return null
      }
    })

    const validPools = pools.filter((_, i) => checksummedAddresses[i] !== null) as typeof pools
    const addresses = checksummedAddresses.filter((a): a is NonNullable<typeof a> => a !== null)
    if (invalidPoolAddressCount > 0) {
      this.logger.warn({ chain, invalidPoolAddressCount }, 'Gearbox configured pools include invalid addresses')
    }
    if (addresses.length === 0) {
      throw new Error('No valid Gearbox pool addresses configured')
    }

    try {
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
    } catch (error) {
      this.logger.warn(
        { chain, error: error instanceof Error ? error.message : String(error) },
        'Gearbox multicall failed; falling back to sequential reads'
      )
      for (let i = 0; i < addresses.length; i++) {
        const pool = validPools[i]
        const addr = addresses[i]
        try {
          const totalAssets = await client.readContract({
            address: addr,
            abi: POOL_V3_ABI,
            functionName: 'totalAssets'
          })
          totalTvl += totalAssets
        } catch (seqError) {
          this.logger.warn({ pool: pool.name, error: seqError instanceof Error ? seqError.message : String(seqError) }, 'Failed to query pool')
        }
      }
    }

    const blockNumber = await client.getBlockNumber()

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      blockNumber: Number(blockNumber),
      metadata: { source: this.source, endpoint: chainConfig.rpcUrl, endpoints: getConfiguredRpcEndpoints(chain) }
    }
  }
}
