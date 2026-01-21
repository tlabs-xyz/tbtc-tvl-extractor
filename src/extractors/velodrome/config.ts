import { Chain } from '../../types/index.js'

// Chain network identifiers for GeckoTerminal API
export const GECKO_TERMINAL_NETWORKS: Partial<Record<Chain, string>> = {
  [Chain.OPTIMISM]: 'optimism'
}

// DEX identifiers for filtering Velodrome pools on GeckoTerminal
// Velodrome V2 and Slipstream pools are both under 'velodrome-finance' namespace
export const VELODROME_DEX_IDENTIFIERS = [
  'velodrome-finance-v2',
  'velodrome-finance-slipstream'
]

// Velodrome Slipstream (CL) pools containing tBTC - fallback if API fails
// Source: GeckoTerminal API https://api.geckoterminal.com/api/v2/networks/optimism/tokens/0x6c84a8f1c29108f47a79964b5fe888d4f4d0de40/pools
export const VELODROME_CL_POOLS_FALLBACK: Partial<Record<Chain, string[]>> = {
  [Chain.OPTIMISM]: [
    '0xec3d9098bd40ec741676fc04d4bd26bccf592aa3', // tBTC/WETH 0.3% CL
    '0x8949a8e02998d76d7a703cac9ee7e0f529828011', // tBTC/WBTC 0.01% CL
    '0xa1507a6d0aa14f61cf9195ebd10cc15ecf1e40f2', // tBTC/WETH 0.3% CL (second)
    '0xe612cb2b5644aef0ad3e922bae70a8374c63515f'  // tBTC/WBTC 0.01% CL (third)
  ]
}
