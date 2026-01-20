#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { loadConfig } from './config/index.js'
import { createLogger } from './utils/logger.js'
import { writeResults } from './utils/output.js'
import { createExtractors } from './extractors/index.js'
import { aggregateResults } from './aggregator/index.js'
import { Validator } from './validators/index.js'
import { Chain, ExtractionResult } from './types/index.js'
import { formatUnits } from 'viem'

interface ProtocolEntry {
  protocol: string
  category: string
  chain: string
  url: string
  tvl: number
}

interface ExtractionAttempt {
  protocol: string
  chain: string
  category: string
  tvl: string | 'NOT_IMPL' | 'FAILED' | 'SKIPPED'
  tvlRaw?: bigint
  skipReason?: string
}

// Protocols to skip with reasons (not indexable via subgraphs/RPC)
const SKIP_PROTOCOLS: Record<string, Record<string, string>> = {
  'Asymmetry': {
    'Ethereum': 'No public subgraph or API available'
  },
  'Merkl': {
    'Ethereum': 'Rewards aggregator, not a TVL protocol'
  },
  'Nerite': {
    'Arbitrum': 'No public subgraph available yet'
  },
  'Starknet Earn': {
    'Starknet': 'Native staking aggregator, no API'
  },
  '0D': {
    'Starknet': 'Vesu vault wrapper, TVL counted in Vesu'
  },
  'Bluefin': {
    'Sui': 'Perps DEX, no spot TVL subgraph'
  }
}

function normalizeChainName(chain: string): Chain | null {
  const normalized = chain.toLowerCase()
  switch (normalized) {
    case 'ethereum': return Chain.ETHEREUM
    case 'arbitrum': return Chain.ARBITRUM
    case 'base': return Chain.BASE
    case 'optimism': return Chain.OPTIMISM
    case 'starknet': return Chain.STARKNET
    case 'sui': return Chain.SUI
    default: return null
  }
}

function normalizeProtocolName(protocol: string): string {
  // Normalize protocol names to match extractor naming
  const normalized = protocol.toLowerCase()
  if (normalized === 'aave') return 'Aave V3'
  if (normalized === 'uniswap') return 'Uniswap'
  if (normalized === 'compound') return 'Compound'
  if (normalized === 'curve') return 'Curve'
  if (normalized === 'spark/maker') return 'Spark Lend'
  if (normalized === 'aerodrome') return 'Aerodrome'
  if (normalized === 'velodrome') return 'Velodrome'
  return protocol
}

function printExtractionSummary(attempts: ExtractionAttempt[]) {
  console.log('\n' + '═'.repeat(60))

  // Calculate column widths
  const protocolWidth = Math.max(15, ...attempts.map(a => a.protocol.length))
  const chainWidth = Math.max(10, ...attempts.map(a => a.chain.length))
  const tvlWidth = 25

  // Print header
  const header = `${'Protocol'.padEnd(protocolWidth)}  ${'Chain'.padEnd(chainWidth)}  ${'TVL (tBTC)'.padEnd(tvlWidth)}`
  console.log(header)
  console.log('─'.repeat(60))

  // Sort: successful first (by TVL desc), then NOT_IMPL, then SKIPPED, then FAILED
  const isSuccess = (tvl: string) => tvl !== 'NOT_IMPL' && tvl !== 'FAILED' && tvl !== 'SKIPPED'
  const sorted = [...attempts].sort((a, b) => {
    if (a.tvl === 'FAILED' && b.tvl !== 'FAILED') return 1
    if (a.tvl !== 'FAILED' && b.tvl === 'FAILED') return -1
    if (a.tvl === 'SKIPPED' && b.tvl !== 'SKIPPED' && b.tvl !== 'FAILED') return 1
    if (a.tvl !== 'SKIPPED' && a.tvl !== 'FAILED' && b.tvl === 'SKIPPED') return -1
    if (a.tvl === 'NOT_IMPL' && isSuccess(b.tvl)) return 1
    if (isSuccess(a.tvl) && b.tvl === 'NOT_IMPL') return -1
    if (a.tvlRaw && b.tvlRaw) return Number(b.tvlRaw - a.tvlRaw)
    return 0
  })

  // Print rows
  for (const attempt of sorted) {
    const protocol = attempt.protocol.padEnd(protocolWidth)
    const chain = attempt.chain.padEnd(chainWidth)

    let tvlDisplay: string
    if (attempt.tvl === 'SKIPPED') {
      tvlDisplay = `⊘ ${attempt.skipReason || 'Skipped'}`
    } else if (attempt.tvl === 'NOT_IMPL') {
      tvlDisplay = '✗ Not implemented'
    } else if (attempt.tvl === 'FAILED') {
      tvlDisplay = '✗ Extraction failed'
    } else {
      tvlDisplay = `✓ ${attempt.tvl}`.padEnd(tvlWidth)
    }

    console.log(`${protocol}  ${chain}  ${tvlDisplay}`)
  }

  console.log('─'.repeat(60))

  // Print statistics
  const successful = attempts.filter(a => a.tvl !== 'NOT_IMPL' && a.tvl !== 'FAILED' && a.tvl !== 'SKIPPED')
  const failed = attempts.filter(a => a.tvl === 'FAILED')
  const skipped = attempts.filter(a => a.tvl === 'SKIPPED' || a.tvl === 'NOT_IMPL')

  console.log('')
  console.log(`Total Protocols:     ${attempts.length}`)
  console.log(`✓ Extracted:         ${successful.length}`)
  console.log(`✗ Failed:            ${failed.length}`)
  console.log(`⊘ Skipped:           ${skipped.length}`)

  console.log('')
  console.log('═'.repeat(60))
}

async function main() {
  const config = loadConfig()
  const logger = createLogger(config.logLevel)

  logger.info('Starting tBTC TVL extraction')

  try {
    // Load protocols from data file
    const protocolsPath = join(process.cwd(), 'data', 'use-tbtc-protocols.json')
    const protocolsData = await readFile(protocolsPath, 'utf-8')
    const protocols: ProtocolEntry[] = JSON.parse(protocolsData)

    logger.info({ protocolCount: protocols.length }, 'Loaded protocols from use-tbtc-protocols.json')

    // Initialize components
    const extractors = createExtractors(logger, {
      timeout: config.timeout,
      retries: config.retries
    })

    logger.info({ extractorCount: extractors.length }, 'Extractors initialized')

    // Create a map of available extractors
    const extractorMap = new Map(
      extractors.map(e => [`${e.protocolName}`, e])
    )

    // Track all extraction attempts
    const attempts: ExtractionAttempt[] = []
    const results: ExtractionResult[] = []

    // Process each protocol entry
    for (const entry of protocols) {
      // Check if protocol should be skipped (with reason)
      const skipReason = SKIP_PROTOCOLS[entry.protocol]?.[entry.chain]
      if (skipReason) {
        logger.debug({ protocol: entry.protocol, chain: entry.chain, reason: skipReason }, 'Protocol skipped')
        attempts.push({
          protocol: entry.protocol,
          chain: entry.chain,
          category: entry.category,
          tvl: 'SKIPPED',
          skipReason
        })
        continue
      }

      const chain = normalizeChainName(entry.chain)
      if (!chain) {
        logger.warn({ chain: entry.chain }, 'Unknown chain, skipping')
        attempts.push({
          protocol: entry.protocol,
          chain: entry.chain,
          category: entry.category,
          tvl: 'NOT_IMPL'
        })
        continue
      }

      const protocolName = normalizeProtocolName(entry.protocol)
      const extractor = extractorMap.get(protocolName)

      if (!extractor) {
        logger.debug({ protocol: protocolName, chain }, 'No extractor available')
        attempts.push({
          protocol: entry.protocol,
          chain: entry.chain,
          category: entry.category,
          tvl: 'NOT_IMPL'
        })
        continue
      }

      if (!extractor.canExtract(chain)) {
        logger.debug({ protocol: protocolName, chain }, 'Extractor does not support this chain')
        attempts.push({
          protocol: entry.protocol,
          chain: entry.chain,
          category: entry.category,
          tvl: 'NOT_IMPL'
        })
        continue
      }

      // Attempt extraction
      try {
        logger.info({ protocol: protocolName, chain }, 'Starting extraction')
        const result = await extractor.extract(chain)

        logger.info({
          protocol: protocolName,
          chain,
          tvl: result.tvl.toString()
        }, 'Extraction completed')

        results.push(result)
        attempts.push({
          protocol: entry.protocol,
          chain: entry.chain,
          category: entry.category,
          tvl: formatUnits(result.tvl, 18),
          tvlRaw: result.tvl
        })
      } catch (error) {
        logger.error({
          protocol: protocolName,
          chain,
          error: error instanceof Error ? error.message : String(error)
        }, 'Extraction failed')

        attempts.push({
          protocol: entry.protocol,
          chain: entry.chain,
          category: entry.category,
          tvl: 'FAILED'
        })
      }
    }

    logger.info({
      totalResults: results.length,
      successfulExtractions: results.filter(r => r.tvl > 0n).length
    }, 'All extractions completed')

    // Validate results
    const validator = new Validator()
    const validationReport = validator.validate(results)

    logger.info({
      passed: validationReport.passed,
      warnings: validationReport.summary.warningCount,
      errors: validationReport.summary.errorCount
    }, 'Validation completed')

    // Log validation issues
    for (const warning of validationReport.warnings) {
      logger.warn(warning, 'Validation warning')
    }

    for (const error of validationReport.errors) {
      logger.error(error, 'Validation error')
    }

    // Aggregate results
    const aggregated = aggregateResults(results, '1.0.0')
    aggregated.validationReport = validationReport

    logger.info({
      totalTvl: aggregated.summary.totalTvl,
      protocolCount: aggregated.summary.protocolCount,
      chainCount: aggregated.summary.chainCount,
      successRate: aggregated.summary.successRate
    }, 'Results aggregated')

    // Write detailed output
    const outputPath = await writeResults(aggregated, config.outputDir)
    logger.info({ outputPath }, 'Results written to file')

    // Write simple tvl.json (same format as input, with TVL populated)
    // Use -1 to indicate: failed extraction (after retries), not implemented, or skipped
    const tvlOutput = attempts.map(a => ({
      protocol: a.protocol,
      chain: a.chain,
      tvl: a.tvl === 'FAILED' || a.tvl === 'NOT_IMPL' || a.tvl === 'SKIPPED'
        ? '-1'
        : a.tvlRaw ? formatUnits(a.tvlRaw, 18) : '0'
    }))
    await mkdir(config.outputDir, { recursive: true })
    const tvlPath = join(config.outputDir, 'tvl.json')
    await writeFile(tvlPath, JSON.stringify(tvlOutput, null, 2), 'utf-8')
    logger.info({ tvlPath }, 'TVL summary written')

    // Print summary table
    printExtractionSummary(attempts)

    // Print additional info
    console.log(`Output: ${tvlPath}`)

    if (!validationReport.passed) {
      console.log(`\n⚠  Validation errors: ${validationReport.summary.errorCount}`)
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    logger.error({
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    }, 'Fatal error')

    console.error('\n✗ Extraction failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run main function
main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
