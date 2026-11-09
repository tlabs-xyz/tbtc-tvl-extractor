import { formatUnits } from 'viem'

export interface ExtractionAttempt {
  protocol: string
  chain: string
  category: string
  tvl: string | 'NOT_IMPL' | 'FAILED' | 'SKIPPED'
  tvlRaw?: bigint
  updatedAt?: string
  skipReason?: string
}

/** Preserve the legacy array/-1 contract and add observation time only on success. */
export function buildTvlFeed(attempts: ExtractionAttempt[]) {
  return attempts.map((attempt) => {
    const available =
      !['FAILED', 'NOT_IMPL', 'SKIPPED'].includes(attempt.tvl) &&
      attempt.tvlRaw !== undefined
    return {
      protocol: attempt.protocol,
      chain: attempt.chain,
      tvl: available ? formatUnits(attempt.tvlRaw!, 18) : '-1',
      ...(available && attempt.updatedAt
        ? { updatedAt: attempt.updatedAt }
        : {}),
    }
  })
}
