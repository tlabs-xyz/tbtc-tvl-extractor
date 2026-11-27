import { STAGING_RPC } from '../src/pilot/proxy-fetch.js'

const token = process.env.TVL_EVM_RPC_PROXY_TOKEN?.trim()
if (process.env.TVL_EVM_RPC_PROXY !== 'staging' || !token || !process.env.THEGRAPH_API_KEY?.trim()) {
  throw new Error('The EVM rehearsal requires staging mode and its existing CI credentials')
}

const stagingUrls = new Set<string>(Object.values(STAGING_RPC))
const successful = new Set<string>()
const send = globalThis.fetch
let unsafe = false

function refuse(message: string): never {
  unsafe = true
  throw new Error(message)
}

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  const staging = stagingUrls.has(request.url) && request.method === 'POST'
  if (staging) {
    if (request.headers.get('Authorization') !== `Bearer ${token}` || request.redirect !== 'error') {
      refuse('Extractor did not supply host-pinned staging proxy authentication')
    }
  } else {
    const allowed =
      (request.method === 'GET' && url.origin === 'https://api.curve.finance' && url.pathname.startsWith('/v1/getPools/')) ||
      (request.method === 'POST' && url.origin === 'https://gateway.thegraph.com' && /^\/api\/[^/]+\/subgraphs\/id\/[^/]+$/.test(url.pathname))
    if (!allowed || request.url.includes(token) || [...request.headers.values()].some(value => value.includes(token))) {
      refuse('EVM rehearsal blocked an out-of-scope request')
    }
  }
  const response = await send(new Request(request, { redirect: 'error' }))
  if (staging && response.ok) successful.add(request.url)
  return response
}

process.on('exit', code => {
  if (unsafe || (code === 0 && successful.size !== stagingUrls.size)) {
    console.error('EVM rehearsal failed staging authentication, egress, or three-chain coverage')
    process.exitCode = 1
  } else if (code === 0) {
    console.log('Extractor-authenticated staging RPC verified on Ethereum, Arbitrum, and Base')
  }
})
