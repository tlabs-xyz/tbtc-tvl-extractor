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

// V4 endpoints - will be added when available
export const UNISWAP_V4_ENDPOINTS: Partial<Record<Chain, string>> = {}
