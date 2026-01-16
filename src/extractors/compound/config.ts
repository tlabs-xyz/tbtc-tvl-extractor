import { Chain } from '../../types/index.js'

// Compound V3 Community subgraph IDs from github.com/papercliplabs/compound-v3-subgraph
// Only Ethereum is configured per use-tbtc-protocols.json
export const COMPOUND_V3_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: '5nwMCSHaTqG3Kd2gHznbTXEnZ9QNWsssQfbHhDqQSQFp'
}

// Build endpoint URL with API key
export function getCompoundV3Endpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = COMPOUND_V3_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}
