import { Chain } from '../../types/index.js'

// Velodrome Optimism subgraph ID (Messari DEX AMM schema)
export const VELODROME_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.OPTIMISM]: '7tA4PY1VmbycJeoVtn2mjQK4NbozgwTuZgrxDTxzEDL1'
}

// Build endpoint URL with API key
export function getVelodromeEndpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = VELODROME_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}
