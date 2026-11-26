export const STAGING_RPC = {
  ethereum: 'https://eth-mainnet.rpc-staging.tnetworklabs.com/v2',
  base: 'https://base-mainnet.rpc-staging.tnetworklabs.com/v2',
  arbitrum: 'https://arb-mainnet.rpc-staging.tnetworklabs.com/v2'
} as const

export function createPilotFetch(token: string, send: typeof fetch) {
  const rpcUrls = new Set<string>(Object.values(STAGING_RPC))
  let blocked = false
  const guardedFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const headers = new Headers(request.headers)
    if (request.method === 'POST' && rpcUrls.has(request.url)) {
      headers.set('Authorization', `Bearer ${token}`)
    } else if (!(request.method === 'GET' && url.origin === 'https://api.curve.finance' && url.pathname.startsWith('/v1/getPools/'))) {
      blocked = true
      throw new Error('Pilot blocked an out-of-scope HTTP request')
    }
    return send(new Request(request, { headers, redirect: 'error' }))
  }
  return {
    fetch: guardedFetch,
    assertClean() {
      if (blocked) throw new Error('Pilot attempted a request outside the staging proxy or Curve discovery API')
    }
  }
}
