import { Chain } from '../../types/index.js'

// Aerodrome Base Full subgraph ID
export const AERODROME_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.BASE]: 'GENunSHWLBXm59mBSgPzQ8metBEp9YDfdqwFr91Av1UM'
}

// Build endpoint URL with API key
export function getAerodromeEndpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = AERODROME_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}
