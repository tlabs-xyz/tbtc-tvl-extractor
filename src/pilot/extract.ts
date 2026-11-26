import { guard } from './setup.js'
import { writeFile } from 'node:fs/promises'
import { Chain } from '../types/index.js'
import { STAGING_RPC } from './proxy-fetch.js'
import { CurveExtractor } from '../extractors/curve/index.js'
import { createLogger } from '../utils/logger.js'

async function run() {
  const targets = [
    { chain: Chain.ETHEREUM, endpoint: STAGING_RPC.ethereum, chainId: 1 },
    { chain: Chain.BASE, endpoint: STAGING_RPC.base, chainId: 8453 },
    { chain: Chain.ARBITRUM, endpoint: STAGING_RPC.arbitrum, chainId: 42161 }
  ]
  const extractor = new CurveExtractor(createLogger('silent'), { timeout: 10000, retries: 1 })
  const results = []
  for (const { chain, endpoint, chainId } of targets) {
    console.log(`Checking staging proxy and extracting Curve TVL on ${chain}`)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) throw new Error(`${chain}: staging proxy returned HTTP ${response.status}`)
    const envelope = await response.json() as { result?: string }
    if (envelope.result !== `0x${chainId.toString(16)}`) throw new Error(`${chain}: wrong chain ID from staging proxy`)

    let result
    try {
      result = await extractor.extract(chain)
    } catch {
      guard.assertClean()
      throw new Error(`${chain}: Curve extraction failed`)
    }
    guard.assertClean()
    if (!Number.isSafeInteger(result.blockNumber) || !result.blockNumber || result.tvl <= 0n) {
      throw new Error(`${chain}: extraction did not yield a block and positive tBTC balance`)
    }
    results.push({ chain, chainId, protocol: result.protocol, blockNumber: result.blockNumber, tvlRaw: result.tvl.toString(), endpoint })
  }
  await writeFile('staging-proxy-extraction.json', JSON.stringify(results, null, 2) + '\n')
}

run().catch(error => {
  if (error instanceof Error && /^(STAGING_RPC_PROXY_TOKEN is required|Pilot attempted|(?:ethereum|base|arbitrum):)/i.test(error.message)) {
    console.error(error.message)
  } else {
    console.error('Staging proxy pilot failed before producing evidence')
  }
  process.exitCode = 1
})
