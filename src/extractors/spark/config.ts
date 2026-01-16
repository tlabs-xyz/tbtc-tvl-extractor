import { Chain } from '../../types/index.js'

// Spark Lend subgraph ID (Messari schema)
export const SPARK_SUBGRAPH_IDS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si'
}

// Build endpoint URL with API key
export function getSparkEndpoint(chain: Chain, apiKey?: string): string | undefined {
  const subgraphId = SPARK_SUBGRAPH_IDS[chain]
  if (!subgraphId) return undefined

  const key = apiKey || process.env.THEGRAPH_API_KEY
  if (!key) {
    throw new Error('THEGRAPH_API_KEY is required. Get one at https://thegraph.com/studio/')
  }

  return `https://gateway.thegraph.com/api/${key}/subgraphs/id/${subgraphId}`
}
