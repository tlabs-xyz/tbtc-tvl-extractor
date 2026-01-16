import { Chain } from '../../types/index.js'

// Official Aave V3 subgraph IDs from github.com/aave/protocol-subgraphs
export const AAVE_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'Cd2gEDVeqnjBn1hSeqFMitw8Q1iiyV9FYUZkLNRcL87g',
  [Chain.ARBITRUM]: 'DLuE98kEb5pQNXAcKFQGQgfSQ57Xdou4jnVbAEqMfy3B',
  [Chain.BASE]: 'GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF',
  [Chain.OPTIMISM]: 'DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfvb'
}

// Build endpoint URL with API key
export function getAaveEndpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = AAVE_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}
