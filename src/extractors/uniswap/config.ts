import { Chain } from '../../types/index.js'

// Official Uniswap V3 subgraph IDs from docs.uniswap.org/api/subgraph/overview
export const UNISWAP_V3_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
  [Chain.ARBITRUM]: 'FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM',
  [Chain.BASE]: '43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG',
  [Chain.OPTIMISM]: 'Cghf4LfVqPiFw6fp6Y5X5Ubc8UpmUhSfJL82zwiBFLaj'
}

// Build endpoint URL with API key
export function getUniswapV3Endpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = UNISWAP_V3_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}

// Official Uniswap V4 subgraph IDs
// Source: https://docs.uniswap.org/api/subgraph/overview
export const UNISWAP_V4_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G'
  // Other chains will be added as V4 subgraphs become available
}

// Build V4 endpoint URL with API key
export function getUniswapV4Endpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = UNISWAP_V4_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}

// Uniswap V4 PoolManager singleton contracts
// V4 uses a singleton architecture where all pool liquidity is held in one contract
// Source: https://docs.uniswap.org/contracts/v4/deployments
export const UNISWAP_V4_POOL_MANAGER: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: '0x000000000004444c5dc75cB358380D2e3dE08A90',
  [Chain.ARBITRUM]: '0x360e68faccca8ca495c1b759fd9eee466db9fb32',
  [Chain.BASE]: '0x498581ff718922c3f8e6a244956af099b2652b2b',
  [Chain.OPTIMISM]: '0x9a13f98cb987694c9f086b1f5eb990eea8264ec3'
}
