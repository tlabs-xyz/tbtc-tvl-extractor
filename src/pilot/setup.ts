import { createPilotFetch, STAGING_RPC } from './proxy-fetch.js'

const token = process.env.STAGING_RPC_PROXY_TOKEN?.trim()
if (!token) throw new Error('STAGING_RPC_PROXY_TOKEN is required')
if (!process.env.THEGRAPH_API_KEY?.trim()) throw new Error('A pilot THEGRAPH_API_KEY is required')

// Load before the extractor: its chain configuration reads environment variables at import time.
process.env.ETHEREUM_RPC = STAGING_RPC.ethereum
process.env.BASE_RPC = STAGING_RPC.base
process.env.ARBITRUM_RPC = STAGING_RPC.arbitrum
process.env.ETHEREUM_FALLBACK_RPC = ''
process.env.LOG_LEVEL = 'silent'
process.env.STARKNET_RPC = 'https://rpc.starknet.lava.build'
process.env.SUI_RPC = 'https://sui-rpc.publicnode.com'

const guard = createPilotFetch(token, globalThis.fetch)
globalThis.fetch = guard.fetch
process.on('exit', code => {
  try {
    guard.assertClean()
    if (code === 0) guard.assertCoverage()
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 1
  }
})
