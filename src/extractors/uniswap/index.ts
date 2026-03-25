import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { createPublicClient, parseAbi, getAddress } from 'viem'
import { mainnet, arbitrum, base, optimism } from 'viem/chains'
import { GetTBTCPoolsQuery } from './queries.js'
import { UniswapPoolSchema } from './schema.js'
import { getUniswapV3Endpoint, UNISWAP_V4_POOL_MANAGER } from './config.js'
import { TBTC_ADDRESSES, CHAIN_CONFIGS, createEvmHttpTransport, getConfiguredRpcEndpoints } from '../../config/index.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)'
])

const V3_BALANCE_MULTICALL_BATCH = 512

const VIEM_CHAINS: Record<string, typeof mainnet | typeof arbitrum | typeof base | typeof optimism> = {
  [Chain.ETHEREUM]: mainnet,
  [Chain.ARBITRUM]: arbitrum,
  [Chain.BASE]: base,
  [Chain.OPTIMISM]: optimism
}

export class UniswapExtractor extends BaseExtractor {
  readonly protocolName = 'Uniswap'
  readonly supportedChains = [Chain.ETHEREUM, Chain.ARBITRUM, Chain.BASE, Chain.OPTIMISM]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractHybrid(chain),
      `Uniswap extraction for ${chain}`
    )
  }

  private async extractHybrid(chain: Chain): Promise<ExtractionResult> {
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const chainConfig = CHAIN_CONFIGS[chain]
    const viemChain = VIEM_CHAINS[chain]

    if (!viemChain) {
      throw new Error(`Uniswap not configured for chain: ${chain}`)
    }

    // Step 1: Discover V3 pools from subgraph
    const v3PoolAddresses = await this.discoverV3Pools(chain, tbtcAddress)

    // Step 2: Get on-chain balances via RPC
    const client = createPublicClient({
      chain: viemChain,
      transport: createEvmHttpTransport(chain, this.options.timeout ?? 10000)
    })

    const tbtc = tbtcAddress as `0x${string}`

    let totalTvl = 0n
    let failedV3Reads = 0

    // Get V3 pool balances (batched multicall — avoids RPC rate limits)
    if (v3PoolAddresses.length > 0) {
      for (let i = 0; i < v3PoolAddresses.length; i += V3_BALANCE_MULTICALL_BATCH) {
        const batch = v3PoolAddresses.slice(i, i + V3_BALANCE_MULTICALL_BATCH)
        try {
          const results = await client.multicall({
            contracts: batch.map(poolAddress => ({
              address: tbtc,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddress as `0x${string}`]
            })),
            allowFailure: true
          })
          for (const r of results) {
            if (r.status === 'success') {
              totalTvl += r.result as bigint
            } else {
              failedV3Reads++
            }
          }
        } catch (error) {
          this.logger.warn(
            { chain, error: error instanceof Error ? error.message : String(error), batchSize: batch.length },
            'Uniswap V3 multicall batch failed; falling back to sequential reads'
          )
          for (const poolAddress of batch) {
            try {
              const balance = await client.readContract({
                address: tbtc,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [poolAddress as `0x${string}`]
              })
              totalTvl += balance
            } catch {
              failedV3Reads++
            }
          }
        }
      }
    }
    if (failedV3Reads > 0) {
      this.logger.warn({ chain, failedV3Reads }, 'Uniswap V3 balance queries had partial failures')
    }

    // Get V4 PoolManager balance (singleton contract holds all V4 liquidity)
    const v4PoolManager = UNISWAP_V4_POOL_MANAGER[chain]
    if (v4PoolManager) {
      try {
        const v4Balance = await client.readContract({
          address: tbtc,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [v4PoolManager as `0x${string}`]
        })
        totalTvl += v4Balance
      } catch (error) {
        this.logger.warn({ chain, error: error instanceof Error ? error.message : String(error) }, 'Failed to query V4 PoolManager')
      }
    }

    const blockNumber = await client.getBlockNumber()

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      blockNumber: Number(blockNumber),
      metadata: {
        source: this.source,
        endpoint: chainConfig.rpcUrl,
        endpoints: getConfiguredRpcEndpoints(chain),
        poolCount: v3PoolAddresses.length + (v4PoolManager ? 1 : 0)
      }
    }
  }

  private async discoverV3Pools(chain: Chain, tbtcAddress: string): Promise<string[]> {
    const v3Endpoint = getUniswapV3Endpoint(chain)
    if (!v3Endpoint) {
      throw new Error(`Uniswap V3 endpoint not configured for chain: ${chain}`)
    }

    try {
      const client = new GraphQLClient(v3Endpoint)

      const rawResponse = await client.request(
        GetTBTCPoolsQuery,
        { token: tbtcAddress.toLowerCase() }
      )

      const validated = UniswapPoolSchema.parse(rawResponse)
      const addresses: string[] = []
      let invalidCount = 0
      for (const pool of validated.pools) {
        try {
          addresses.push(getAddress(pool.id).toLowerCase())
        } catch {
          invalidCount++
        }
      }
      if (invalidCount > 0) {
        this.logger.warn({ chain, invalidCount }, 'Uniswap V3 subgraph returned invalid pool addresses')
      }
      return addresses
    } catch (error) {
      throw new Error(`Failed to query V3 subgraph for pools on ${chain}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
