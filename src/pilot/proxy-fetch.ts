export const STAGING_RPC = {
  ethereum: 'https://eth-mainnet.rpc-staging.tnetworklabs.com/v2',
  base: 'https://base-mainnet.rpc-staging.tnetworklabs.com/v2',
  arbitrum: 'https://arb-mainnet.rpc-staging.tnetworklabs.com/v2'
} as const

function isExtractionDependency(request: Request, url: URL): boolean {
  if (request.method === 'GET') {
    return (url.origin === 'https://api.curve.finance' && url.pathname.startsWith('/v1/getPools/'))
      || (url.origin === 'https://vaults.api.sui-prod.bluefin.io' && url.pathname === '/api/v1/vaults')
      || (url.origin === 'https://swap.api.sui-prod.bluefin.io' && url.pathname === '/api/v1/pools/info')
  }
  return request.method === 'POST' && (
    (url.origin === 'https://gateway.thegraph.com' && /^\/api\/[^/]+\/subgraphs\/id\/[^/]+$/.test(url.pathname))
    || url.origin === 'https://rpc.starknet.lava.build'
    || url.origin === 'https://sui-rpc.publicnode.com'
  )
}

export function createPilotFetch(token: string, send: typeof fetch) {
  const rpcUrls = new Set<string>(Object.values(STAGING_RPC))
  const reached = new Set<string>()
  let blocked = false
  const guardedFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const headers = new Headers(request.headers)
    const stagingRpc = request.method === 'POST' && rpcUrls.has(request.url)
    if (stagingRpc) {
      headers.set('Authorization', `Bearer ${token}`)
    } else if (!isExtractionDependency(request, url)) {
      blocked = true
      throw new Error('Pilot blocked an out-of-scope HTTP request')
    }
    const response = await send(new Request(request, { headers, redirect: 'error' }))
    if (stagingRpc && response.ok) reached.add(request.url)
    return response
  }
  return {
    fetch: guardedFetch,
    assertClean() {
      if (blocked) throw new Error('Pilot attempted a request outside its endpoint allowlist')
    },
    assertCoverage() {
      if (reached.size !== rpcUrls.size) throw new Error('Pilot did not reach all three staging RPC endpoints')
    }
  }
}
