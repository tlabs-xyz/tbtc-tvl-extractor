import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, parseAbi, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { CHAIN_CONFIGS, createEvmHttpTransport, getConfiguredRpcEndpoints } from '../../config/chains.js'
import { MORPHO_BLUE } from './config.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)'
])

export class MorphoExtractor extends BaseExtractor {
  readonly protocolName = 'Morpho'
  readonly supportedChains = [Chain.ETHEREUM]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Morpho extraction for ${chain}`
    )
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const morphoAddress = MORPHO_BLUE[chain]
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const chainConfig = CHAIN_CONFIGS[chain]

    if (!morphoAddress) {
      throw new Error(`Morpho Blue not configured for chain: ${chain}`)
    }

    const client = createPublicClient({
      chain: mainnet,
      transport: createEvmHttpTransport(chain, this.options.timeout ?? 10000)
    })

    const totalTvl = await client.readContract({
      address: getAddress(tbtcAddress),
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [getAddress(morphoAddress)]
    })

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
