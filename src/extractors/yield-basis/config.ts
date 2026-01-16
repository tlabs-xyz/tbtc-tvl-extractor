import { Chain } from '../../types/index.js'

/**
 * Yield Basis Protocol Configuration
 *
 * Yield Basis is an on-chain liquidity protocol solving the Impermanent Loss problem.
 * It uses Curve pools and allows LPs to have direct spot exposure to assets while earning yield.
 *
 * IMPORTANT: Yield Basis deposits tBTC into Curve pools. The actual tBTC holdings
 * are in the Curve pools, not in Yield Basis contracts directly. This means:
 * - Our Curve extractor already captures the tBTC TVL
 * - Counting Yield Basis separately would be double-counting
 *
 * The yb-tBTC token (0x2b513ebe7070cff91cf699a0bfe5075020c732ff) represents LP shares,
 * not tBTC holdings. The underlying tBTC is held in Curve pools.
 *
 * This extractor will correctly return 0 TVL since we shouldn't double-count.
 *
 * Data source: Direct RPC balanceOf calls
 */

export interface YieldBasisMarket {
  marketAddress: string  // The market contract that holds tBTC deposits
  name: string
}

/**
 * Yield Basis market addresses per chain
 * These are the contracts that hold user tBTC deposits
 */
export const YIELD_BASIS_MARKETS: Partial<Record<Chain, YieldBasisMarket[]>> = {
  [Chain.ETHEREUM]: [
    {
      marketAddress: '0xb5a57e59782e451884b07297bbfdd19f63913fd4',
      name: 'tBTC Market'
    }
  ]
}

/**
 * Yield Basis Factory address (for future pool discovery)
 */
export const YIELD_BASIS_FACTORY: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: '0x370a449FeBb9411c95bf897021377fe0B7D100c0'
}
