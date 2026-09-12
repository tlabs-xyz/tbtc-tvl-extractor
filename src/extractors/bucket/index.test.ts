import pino from 'pino'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Chain, ExtractionSource } from '../../types/index.js'
import { createExtractors } from '../index.js'
import { SUI_RPC_URL } from './config.js'
import { BucketExtractor } from './index.js'

const logger = pino({ level: 'silent' })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Bucket extraction without the SDK', () => {
  it.each([
    { vault: '200000000', snapshot: '300000000', expected: 3n * 10n ** 18n },
    { vault: '500000000', snapshot: '300000000', expected: 5n * 10n ** 18n },
    { vault: '0', snapshot: '0', expected: 0n }
  ])('reads collateral directly from Sui ($vault, $snapshot)', async ({ vault, snapshot, expected }) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      jsonrpc: '2.0',
      id: 1,
      result: {
        data: {
          content: {
            fields: {
              collateral_vault: vault,
              bottle_table: { fields: { total_collateral_snapshot: snapshot } }
            }
          }
        }
      }
    }))
    vi.stubGlobal('fetch', fetchMock)

    const extractor = new BucketExtractor(logger, { retries: 1 })
    const result = await extractor.extract(Chain.SUI)

    expect(result).toMatchObject({
      protocol: 'Bucket',
      chain: Chain.SUI,
      tvl: expected,
      metadata: { source: ExtractionSource.RPC, endpoint: SUI_RPC_URL }
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getObject',
        params: [
          '0x3a3545739027335834e930175942fb11a9d5ca4aea2ebad46770a1cc77d340b3',
          { showContent: true }
        ]
      })
    })
  })

  it('loads the extractor registry and registers Bucket', () => {
    const extractors = createExtractors(logger)
    expect(extractors.find(extractor => extractor.protocolName === 'Bucket'))
      .toBeInstanceOf(BucketExtractor)
  })
})
