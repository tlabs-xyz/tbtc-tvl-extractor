import { Chain } from '../../types/index.js'

// All chains now use RPC + Curve API auto-discovery
// Subgraphs were unreliable (Messari didn't index TwoCrypto-NG Factory, etc.)

// Known Curve pools containing tBTC (for chains using RPC mode)
export interface CurvePool {
  poolAddress: string
  name: string
}

// Ethereum Curve pools containing tBTC
// Note: The Messari subgraph doesn't index TwoCrypto-NG Factory (0x98ee851a00abee0d95d08cf4ca2bdce32aeaaf7f)
// so we need to manually track these pools via RPC
export const CURVE_ETHEREUM_POOLS: CurvePool[] = [
  {
    // TwoCrypto-NG pool: crvUSD/tBTC - deployed by Yield Basis
    // https://curve.finance/dex/ethereum/pools/factory-twocrypto-253/deposit
    poolAddress: '0xf1F435B05D255a5dBdE37333C0f61DA6F69c6127',
    name: 'crvUSD/tBTC (factory-twocrypto-253)'
  },
  {
    // crvUSD lending AMM for tBTC collateral
    // https://docs.curve.finance/references/deployed-contracts/
    poolAddress: '0xf9bd9da2427a50908c4c6d1599d8e62837c2bcb0',
    name: 'crvUSD/tBTC Lending AMM'
  },
  {
    // tBTC/WBTC pool (tbtc metapool)
    // https://curve.finance/dex/ethereum/pools/tbtc/deposit
    poolAddress: '0xC25099792E9349C7DD09759744ea681C7de2cb66',
    name: 'tBTC/sbtcCrv'
  }
]

// Base Curve pools containing tBTC
export const CURVE_BASE_POOLS: CurvePool[] = [
  {
    poolAddress: '0x6e53131f68a034873b6bfa15502af094ef0c5854',
    name: 'crvUSD/tBTC/WETH'
  }
]

// Arbitrum Curve pools containing tBTC (fallback if API fails)
export const CURVE_ARBITRUM_POOLS: CurvePool[] = [
  {
    poolAddress: '0x186cF879186986A20aADFb7eAD50e3C20cb26CeC',
    name: '2BTC-ng (factory-stable-ng-69)'
  },
  {
    poolAddress: '0xDa73dC70D5ca3F51b0000C308abcd358b5F3FEFe',
    name: 'tBTC/crvUSD (factory-twocrypto-30)'
  },
  {
    poolAddress: '0x3c64d44Ab19D63F09ebaD38fd7b913Ab7E15e341',
    name: 'TricryptoFRAX (factory-tricrypto-8)'
  },
  {
    poolAddress: '0xFA8BD41E404fc66448C4bAf717b697089569Ff41',
    name: 'GODDOG/tBTC/crvUSD (factory-tricrypto-44)'
  }
]

// Optimism has no tBTC Curve pools as of Jan 2026
export const CURVE_OPTIMISM_POOLS: CurvePool[] = []

// Get pools for a specific chain (fallback if API discovery fails)
export function getCurvePoolsForChain(chain: Chain): CurvePool[] {
  switch (chain) {
    case Chain.ETHEREUM:
      return CURVE_ETHEREUM_POOLS
    case Chain.BASE:
      return CURVE_BASE_POOLS
    case Chain.ARBITRUM:
      return CURVE_ARBITRUM_POOLS
    case Chain.OPTIMISM:
      return CURVE_OPTIMISM_POOLS
    default:
      return []
  }
}


// Curve API chain names for auto-discovery
export const CURVE_API_CHAIN_NAMES: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'ethereum',
  [Chain.ARBITRUM]: 'arbitrum',
  [Chain.OPTIMISM]: 'optimism',
  [Chain.BASE]: 'base'
}

// Pool types to query from Curve API for auto-discovery
export const CURVE_POOL_TYPES = [
  'main',
  'crypto',
  'factory-stable-ng',
  'factory-crvusd',
  'factory-twocrypto',
  'factory-tricrypto',
  'factory-crypto'
] as const
