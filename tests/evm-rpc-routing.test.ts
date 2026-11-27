import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Chain } from '../src/types/index.js'

const routes = [
  [Chain.ETHEREUM, 'eth-mainnet'],
  [Chain.ARBITRUM, 'arb-mainnet'],
  [Chain.BASE, 'base-mainnet']
] as const

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('TVL_EVM_RPC_PROXY', undefined)
  vi.stubEnv('TVL_EVM_RPC_PROXY_TOKEN', undefined)
  vi.stubEnv('ALCHEMY_API_KEY', 'fixture-direct-key')
  vi.stubEnv('ETHEREUM_RPC', undefined)
  vi.stubEnv('BASE_RPC', undefined)
  vi.stubEnv('ARBITRUM_RPC', undefined)
  vi.stubEnv('OPTIMISM_RPC', undefined)
  vi.stubEnv('ETHEREUM_FALLBACK_RPC', 'https://fallback.example/rpc')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function captureRpc() {
  const requests: Request[] = []
  const send = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    requests.push(request)
    const { id } = await request.json()
    return Response.json({ jsonrpc: '2.0', id, result: '0x123' })
  })
  vi.stubGlobal('fetch', send)
  return { requests, send }
}

it.each([
  ['staging', 'rpc-staging.tnetworklabs.com'],
  ['production', 'rpc.tnetworklabs.com']
])('uses host-pinned Bearer auth for all three %s proxy routes and no others', async (mode, host) => {
  vi.stubEnv('TVL_EVM_RPC_PROXY', mode)
  vi.stubEnv('TVL_EVM_RPC_PROXY_TOKEN', 'fixture-proxy-token')
  vi.stubEnv('ETHEREUM_RPC', 'https://direct-override.example/rpc')
  const { requests } = captureRpc()
  const { CHAIN_CONFIGS, createEvmHttpTransport, getConfiguredRpcEndpoints } = await import('../src/config/chains.js')

  for (const [chain, slug] of routes) {
    const endpoint = `https://${slug}.${host}/v2`
    await expect(createEvmHttpTransport(chain)({ retryCount: 0 }).request({ method: 'eth_blockNumber' })).resolves.toBe('0x123')
    expect(getConfiguredRpcEndpoints(chain)).toEqual([endpoint])
    expect(requests.at(-1)?.url).toBe(endpoint)
    expect(requests.at(-1)?.headers.get('Authorization')).toBe('Bearer fixture-proxy-token')
    expect(requests.at(-1)?.redirect).toBe('error')
  }

  await createEvmHttpTransport(Chain.OPTIMISM)({ retryCount: 0 }).request({ method: 'eth_blockNumber' })
  expect(requests.at(-1)?.url).toBe('https://opt-mainnet.g.alchemy.com/v2/fixture-direct-key')
  expect(requests.at(-1)?.headers.has('Authorization')).toBe(false)
  expect(getConfiguredRpcEndpoints(Chain.STARKNET)).toEqual([])
  expect(getConfiguredRpcEndpoints(Chain.SUI)).toEqual([])
  expect(JSON.stringify(CHAIN_CONFIGS)).not.toContain('fixture-proxy-token')
})

it('does not use a direct or public fallback when proxy RPC fails', async () => {
  vi.stubEnv('TVL_EVM_RPC_PROXY', 'staging')
  vi.stubEnv('TVL_EVM_RPC_PROXY_TOKEN', 'fixture-proxy-token')
  const { send } = captureRpc()
  send.mockImplementationOnce(async () => Response.json({ error: 'denied' }, { status: 401 }))
  const { createEvmHttpTransport } = await import('../src/config/chains.js')
  await expect(createEvmHttpTransport(Chain.ETHEREUM)({ retryCount: 0 }).request({ method: 'eth_blockNumber' })).rejects.toThrow()
  expect(send).toHaveBeenCalledTimes(1)
})

it('restores existing direct routes and Ethereum fallback when proxy mode is unset', async () => {
  vi.stubEnv('TVL_EVM_RPC_PROXY_TOKEN', 'fixture-proxy-token')
  const { requests } = captureRpc()
  const { createEvmHttpTransport, getConfiguredRpcEndpoints } = await import('../src/config/chains.js')
  expect(getConfiguredRpcEndpoints(Chain.ETHEREUM)).toEqual([
    'https://eth-mainnet.g.alchemy.com/v2/fixture-direct-key',
    'https://fallback.example/rpc'
  ])
  await createEvmHttpTransport(Chain.BASE)({ retryCount: 0 }).request({ method: 'eth_blockNumber' })
  expect(requests.at(-1)?.url).toBe('https://base-mainnet.g.alchemy.com/v2/fixture-direct-key')
  expect(requests.at(-1)?.headers.has('Authorization')).toBe(false)
})

it('refuses proxy mode without a token instead of falling back', async () => {
  vi.stubEnv('TVL_EVM_RPC_PROXY', 'staging')
  await expect(import('../src/config/chains.js')).rejects.toThrow('TVL_EVM_RPC_PROXY_TOKEN is required')
})
