import { Chain } from './chain.js'

export enum ExtractionSource {
  SUBGRAPH = 'subgraph',
  API = 'api',
  RPC = 'rpc'
}

export interface ExtractionMetadata {
  source: ExtractionSource
  endpoint?: string
  endpoints?: string[]  // For protocols querying multiple subgraphs (e.g., Uniswap V3 + V4)
  poolCount?: number  // Number of pools queried (for RPC mode)
}

export interface ExtractionResult {
  protocol: string
  chain: Chain
  tvl: bigint  // tBTC amount in wei (smallest unit, 18 decimals)
  tvlUsd?: bigint  // Optional: USD value in smallest unit
  timestamp: Date
  blockNumber?: number  // If available
  metadata: ExtractionMetadata
}

export interface ExtractorOptions {
  timeout?: number  // ms, default 10000
  retries?: number  // default 3
}

export interface AggregatedResult {
  metadata: {
    timestamp: string
    version: string
    runId: string
  }
  chains: Record<string, ChainResult>
  summary: {
    totalTvl: string
    successRate: number
    protocolCount: number
    chainCount: number
  }
  validationReport?: ValidationReport
}

export interface ChainResult {
  totalTvl: string
  protocols: ProtocolResult[]
}

export interface ProtocolResult {
  name: string
  tvl: string
  tvlUsd?: string
  timestamp: string
  blockNumber?: number
  source: ExtractionSource
}

export interface ValidationReport {
  passed: boolean
  warnings: ValidationWarning[]
  errors: ValidationError[]
  summary: {
    totalChecks: number
    passedChecks: number
    warningCount: number
    errorCount: number
  }
}

export interface ValidationWarning {
  level: 'warning'
  message: string
  protocol?: string
  chain?: Chain
  details?: unknown
}

export interface ValidationError {
  level: 'error'
  message: string
  protocol?: string
  chain?: Chain
  details?: unknown
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly context?: {
      protocol?: string
      chain?: Chain
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'ExtractionError'
    if (context?.cause) {
      this.cause = context.cause
    }
  }
}
