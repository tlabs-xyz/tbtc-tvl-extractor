import { describe, expect, it } from 'vitest'
import { buildTvlFeed } from './tvl-feed.js'

describe('public feed compatibility and freshness', () => {
  const entry = {
    protocol: 'Vesu',
    chain: 'Starknet',
    category: 'Lending',
    updatedAt: '2026-09-25T08:12:38.432Z',
  }
  it('publishes observation timestamps for measured positive and zero balances', () => {
    expect(
      buildTvlFeed([
        { ...entry, tvl: '2', tvlRaw: 2n * 10n ** 18n },
        { ...entry, tvl: '0', tvlRaw: 0n },
      ]),
    ).toEqual([
      {
        protocol: 'Vesu',
        chain: 'Starknet',
        tvl: '2',
        updatedAt: entry.updatedAt,
      },
      {
        protocol: 'Vesu',
        chain: 'Starknet',
        tvl: '0',
        updatedAt: entry.updatedAt,
      },
    ])
  })

  it.each(['FAILED', 'NOT_IMPL', 'SKIPPED'])(
    'publishes %s as unavailable without a misleading observation timestamp',
    (tvl) => {
      expect(buildTvlFeed([{ ...entry, tvl }])).toEqual([
        { protocol: 'Vesu', chain: 'Starknet', tvl: '-1' },
      ])
    },
  )
})
