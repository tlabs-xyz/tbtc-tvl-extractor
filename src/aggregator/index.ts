import { ExtractionResult, AggregatedResult, ChainResult } from '../types/index.js'
import { randomUUID } from 'crypto'

export function aggregateResults(
  results: ExtractionResult[],
  version: string = '1.0.0'
): AggregatedResult {
  const runId = randomUUID()
  const chains: Record<string, ChainResult> = {}

  // Group by chain
  for (const result of results) {
    const chainName = result.chain

    if (!chains[chainName]) {
      chains[chainName] = {
        totalTvl: '0',
        protocols: []
      }
    }

    // Add protocol result
    chains[chainName].protocols.push({
      name: result.protocol,
      tvl: result.tvl.toString(),
      tvlUsd: result.tvlUsd?.toString(),
      timestamp: result.timestamp.toISOString(),
      blockNumber: result.blockNumber,
      source: result.metadata.source
    })
  }

  // Calculate totals for each chain using BigInt arithmetic
  for (const chainName in chains) {
    const chain = chains[chainName]
    const totalTvl = chain.protocols.reduce(
      (sum, protocol) => sum + BigInt(protocol.tvl),
      0n
    )
    chain.totalTvl = totalTvl.toString()
  }

  // Calculate overall summary using BigInt arithmetic
  const allTvls = Object.values(chains).map(chain => BigInt(chain.totalTvl))
  const totalTvl = allTvls.reduce((sum, tvl) => sum + tvl, 0n)

  const successfulExtractions = results.filter(r => r.tvl >= 0n).length
  const totalExtractions = results.length
  const successRate = totalExtractions > 0 ? successfulExtractions / totalExtractions : 0

  return {
    metadata: {
      timestamp: new Date().toISOString(),
      version,
      runId
    },
    chains,
    summary: {
      totalTvl: totalTvl.toString(),
      successRate,
      protocolCount: new Set(results.map(r => r.protocol)).size,
      chainCount: Object.keys(chains).length
    }
  }
}
