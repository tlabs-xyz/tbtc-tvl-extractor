import { VESU_POOLS_API } from './config.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function address(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{1,64}$/i.test(value)) {
    throw new Error('Vesu API returned an invalid contract address')
  }
  return `0x${BigInt(value).toString(16)}`
}

/** Discover verified V2 pools so new markets are not silently omitted. */
export async function getVesuPoolAddresses(
  tbtcAddress: string,
  timeout = 10_000,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const response = await fetcher(VESU_POOLS_API, {
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`Vesu pools API HTTP ${response.status}`)
  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.data) || body.data.length === 0) {
    throw new Error('Vesu pools API returned no pool inventory')
  }

  const pools = new Set<string>()
  const token = address(tbtcAddress)
  for (const pool of body.data) {
    if (
      !isRecord(pool) ||
      typeof pool.protocolVersion !== 'string' ||
      typeof pool.isVerified !== 'boolean'
    ) {
      throw new Error('Vesu pools API returned an invalid pool')
    }
    if (pool.protocolVersion !== 'v2' || !pool.isVerified) continue
    if (!Array.isArray(pool.assets))
      throw new Error('Vesu pool is missing its assets')
    const assets = pool.assets.map((asset) => {
      if (!isRecord(asset))
        throw new Error('Vesu pool returned an invalid asset')
      return address(asset.address)
    })
    if (assets.includes(token)) pools.add(address(pool.id))
  }
  if (pools.size === 0)
    throw new Error('Vesu API returned no verified tBTC pools')
  return [...pools]
}
