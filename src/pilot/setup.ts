import { createPilotFetch, STAGING_RPC } from './proxy-fetch.js'

const token = process.env.STAGING_RPC_PROXY_TOKEN?.trim()
if (!token) throw new Error('STAGING_RPC_PROXY_TOKEN is required')

// Load before the extractor: its chain configuration reads environment variables at import time.
process.env.ETHEREUM_RPC = STAGING_RPC.ethereum
process.env.BASE_RPC = STAGING_RPC.base
process.env.ARBITRUM_RPC = STAGING_RPC.arbitrum
process.env.ETHEREUM_FALLBACK_RPC = ''

export const guard = createPilotFetch(token, globalThis.fetch)
globalThis.fetch = guard.fetch
