import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, parseAbi } from 'viem'
import { mainnet, arbitrum, base, optimism } from 'viem/chains'
import { GetTBTCPoolsQuery } from './queries.js'
import { UniswapPoolSchema } from './schema.js'
import { getUniswapV3Endpoint, UNISWAP_V4_POOL_MANAGER } from './config.js'
import { TBTC_ADDRESSES, CHAIN_CONFIGS } from '../../config/index.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)'
])

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
      transport: http(chainConfig.rpcUrl, { timeout: this.options.timeout ?? 10000 })
    })

    let totalTvl = 0n

    // Get V3 pool balances
    if (v3PoolAddresses.length > 0) {
      const batchSize = 50
      for (let i = 0; i < v3PoolAddresses.length; i += batchSize) {
        const batch = v3PoolAddresses.slice(i, i + batchSize)
        const balancePromises = batch.map(poolAddress =>
          client.readContract({
            address: tbtcAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [poolAddress as `0x${string}`]
          }).catch(() => 0n)
        )

        const balances = await Promise.all(balancePromises)
        for (const balance of balances) {
          totalTvl += balance
        }
      }
    }

    // Get V4 PoolManager balance (singleton contract holds all V4 liquidity)
    const v4PoolManager = UNISWAP_V4_POOL_MANAGER[chain]
    if (v4PoolManager) {
      try {
        const v4Balance = await client.readContract({
          address: tbtcAddress as `0x${string}`,
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
        poolCount: v3PoolAddresses.length + (v4PoolManager ? 1 : 0)
      }
    }
  }

  private async discoverV3Pools(chain: Chain, tbtcAddress: string): Promise<string[]> {
    const v3Endpoint = getUniswapV3Endpoint(chain)

    if (!v3Endpoint) {
      return []
    }

    try {
      const client = new GraphQLClient(v3Endpoint)

      const rawResponse = await client.request(
        GetTBTCPoolsQuery,
        { token: tbtcAddress.toLowerCase() }
      )

      const validated = UniswapPoolSchema.parse(rawResponse)

      return validated.pools.map(pool => pool.id.toLowerCase())
    } catch (error) {
      this.logger.warn({ endpoint: v3Endpoint, error: error instanceof Error ? error.message : String(error) }, 'Failed to query V3 subgraph for pools')
      return []
    }
  }
}
