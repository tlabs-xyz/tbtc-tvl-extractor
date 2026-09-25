import { describe, expect, it, vi } from 'vitest'
import { StarknetRpc } from './starknet.js'

describe('Starknet RPC response integrity', () => {
  it('pins reads to the observed block and decodes both uint256 words', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ result: 15429391 }))
      .mockResolvedValueOnce(Response.json({ result: ['0x7', '0x1'] }))
    const rpc = new StarknetRpc('https://rpc.example', 100, fetcher)
    const block = await rpc.getBlockNumber()
    expect(await rpc.readUint256('0x1', '0x2', ['0x3'], block)).toBe(
      (1n << 128n) + 7n,
    )
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      method: 'starknet_call',
      params: {
        block_id: { block_number: block },
        request: { calldata: ['0x3'] },
      },
    })
    expect(fetcher.mock.calls[1][1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    {},
    { error: 'retired endpoint' },
    { result: null },
    { result: 0 },
    { result: '123' },
  ])('rejects unavailable or invalid block responses: %j', async (body) => {
    const rpc = new StarknetRpc(
      'https://rpc.example',
      100,
      vi.fn().mockResolvedValue(Response.json(body)),
    )
    await expect(rpc.getBlockNumber()).rejects.toThrow()
  })

  it.each(
    [
      [],
      ['0x0'],
      ['0x0', '0x0', '0x0'],
      ['bad', '0x0'],
      ['-1', '0x0'],
      ['0x100000000000000000000000000000000', '0x0'],
      null,
    ].map((result) => ({ result })),
  )(
    'rejects malformed balances instead of producing zero: $result',
    async ({ result }) => {
      const rpc = new StarknetRpc(
        'https://rpc.example',
        100,
        vi.fn().mockResolvedValue(Response.json({ result })),
      )
      await expect(rpc.readUint256('0x1', '0x2', [], 1)).rejects.toThrow()
    },
  )

  it('accepts an explicitly measured zero', async () => {
    const rpc = new StarknetRpc(
      'https://rpc.example',
      100,
      vi.fn().mockResolvedValue(Response.json({ result: ['0x0', '0x0'] })),
    )
    expect(await rpc.readUint256('0x1', '0x2', [], 1)).toBe(0n)
  })

  it('rejects HTTP failures even when the body contains a result', async () => {
    const rpc = new StarknetRpc(
      'https://rpc.example',
      100,
      vi
        .fn()
        .mockResolvedValue(Response.json({ result: 123 }, { status: 503 })),
    )
    await expect(rpc.getBlockNumber()).rejects.toThrow('HTTP 503')
  })
})
