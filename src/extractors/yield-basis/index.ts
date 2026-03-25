import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, parseAbi, getAddress, type Address } from 'viem'
import { mainnet } from 'viem/chains'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { CHAIN_CONFIGS, createEvmHttpTransport } from '../../config/chains.js'
import { YIELD_BASIS_FACTORY } from './config.js'

const FACTORY_ABI = parseAbi([
  'function market_count() view returns (uint256)',
  'function markets(uint256) view returns (address asset, address cryptopool, address amm, address vault, uint256 A, uint256 fee)'
])

const CRYPTOPOOL_ABI = parseAbi([
  'function balances(uint256) view returns (uint256)',
  'function coins(uint256) view returns (address)'
])

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
])

type MarketTuple = readonly [Address, Address, Address, Address, bigint, bigint]

export class YieldBasisExtractor extends BaseExtractor {
  readonly protocolName = 'Yield Basis'
  readonly supportedChains = [Chain.ETHEREUM]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Yield Basis extraction for ${chain}`
    )
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const factoryAddress = YIELD_BASIS_FACTORY[chain]
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const chainConfig = CHAIN_CONFIGS[chain]

    if (!factoryAddress) {
      throw new Error(`Yield Basis factory not configured for chain: ${chain}`)
    }

    const client = createPublicClient({
      chain: mainnet,
      transport: createEvmHttpTransport(chain, this.options.timeout ?? 10000)
    })

    const checksummedFactory = getAddress(factoryAddress)
    const checksummedTbtc = getAddress(tbtcAddress)

    const marketCount = await client.readContract({
      address: checksummedFactory,
      abi: FACTORY_ABI,
      functionName: 'market_count'
    })

    const marketsResults = await client.multicall({
      contracts: Array.from({ length: Number(marketCount) }, (_, i) => ({
        address: checksummedFactory,
        abi: FACTORY_ABI,
        functionName: 'markets',
        args: [BigInt(i)]
      })),
      allowFailure: true
    })

    const tbtcMarkets: { cryptopool: Address; amm: Address }[] = []

    for (const r of marketsResults) {
      if (r.status !== 'success') continue
      const market = r.result as unknown as MarketTuple
      const [asset, cryptopool, amm] = market
      if (getAddress(asset).toLowerCase() !== checksummedTbtc.toLowerCase()) {
        continue
      }
      tbtcMarkets.push({
        cryptopool: getAddress(cryptopool),
        amm: getAddress(amm)
      })
    }

    let totalTvl = 0n

    for (const { cryptopool, amm } of tbtcMarkets) {
      try {
        const reads = await client.multicall({
          contracts: [
            {
              address: cryptopool,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [amm]
            },
            {
              address: cryptopool,
              abi: ERC20_ABI,
              functionName: 'totalSupply'
            },
            {
              address: cryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'coins',
              args: [0n]
            },
            {
              address: cryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'coins',
              args: [1n]
            },
            {
              address: cryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'coins',
              args: [2n]
            },
            {
              address: cryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'balances',
              args: [0n]
            },
            {
              address: cryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'balances',
              args: [1n]
            },
            {
              address: cryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'balances',
              args: [2n]
            }
          ],
          allowFailure: true
        })

        const bal0 = reads[0]
        const bal1 = reads[1]
        if (bal0.status !== 'success' || bal1.status !== 'success') continue

        const ammLpBalance = bal0.result as bigint
        const lpTotalSupply = bal1.result as bigint

        if (lpTotalSupply === 0n || ammLpBalance === 0n) continue

        let tbtcPoolBalance = 0n
        for (let coinIdx = 0; coinIdx < 3; coinIdx++) {
          const coinR = reads[2 + coinIdx]
          const balR = reads[5 + coinIdx]
          if (coinR.status !== 'success' || balR.status !== 'success') continue
          const coinAddress = coinR.result as Address
          if (getAddress(coinAddress).toLowerCase() === checksummedTbtc.toLowerCase()) {
            tbtcPoolBalance = balR.result as bigint
            break
          }
        }

        totalTvl += (ammLpBalance * tbtcPoolBalance) / lpTotalSupply
      } catch (error) {
        this.logger.warn(
          { cryptopool, error: error instanceof Error ? error.message : String(error) },
          'Failed to process Yield Basis market'
        )
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
