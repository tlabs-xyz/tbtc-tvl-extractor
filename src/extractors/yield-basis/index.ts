import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, http, parseAbi, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { CHAIN_CONFIGS } from '../../config/chains.js'
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
      transport: http(chainConfig.rpcUrl, { timeout: this.options.timeout ?? 10000 })
    })

    const checksummedFactory = getAddress(factoryAddress)
    const checksummedTbtc = getAddress(tbtcAddress)

    const marketCount = await client.readContract({
      address: checksummedFactory,
      abi: FACTORY_ABI,
      functionName: 'market_count'
    })

    let totalTvl = 0n

    for (let i = 0n; i < marketCount; i++) {
      try {
        const market = await client.readContract({
          address: checksummedFactory,
          abi: FACTORY_ABI,
          functionName: 'markets',
          args: [i]
        })

        const [asset, cryptopool, amm] = market
        if (getAddress(asset).toLowerCase() !== checksummedTbtc.toLowerCase()) {
          continue
        }

        const checksummedCryptopool = getAddress(cryptopool)
        const checksummedAmm = getAddress(amm)

        const ammLpBalance = await client.readContract({
          address: checksummedCryptopool,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [checksummedAmm]
        })

        const lpTotalSupply = await client.readContract({
          address: checksummedCryptopool,
          abi: ERC20_ABI,
          functionName: 'totalSupply'
        })

        if (lpTotalSupply === 0n || ammLpBalance === 0n) continue

        let tbtcPoolBalance = 0n
        for (let coinIdx = 0; coinIdx < 3; coinIdx++) {
          try {
            const coinAddress = await client.readContract({
              address: checksummedCryptopool,
              abi: CRYPTOPOOL_ABI,
              functionName: 'coins',
              args: [BigInt(coinIdx)]
            })
            if (getAddress(coinAddress).toLowerCase() === checksummedTbtc.toLowerCase()) {
              tbtcPoolBalance = await client.readContract({
                address: checksummedCryptopool,
                abi: CRYPTOPOOL_ABI,
                functionName: 'balances',
                args: [BigInt(coinIdx)]
              })
              break
            }
          } catch { break }
        }

        totalTvl += (ammLpBalance * tbtcPoolBalance) / lpTotalSupply
      } catch (error) {
        this.logger.warn({ marketIndex: i.toString(), error: error instanceof Error ? error.message : String(error) }, 'Failed to process market')
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
