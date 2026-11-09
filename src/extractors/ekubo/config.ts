import { Chain } from '../../types/index.js'

/**
 * Ekubo Protocol Configuration (Starknet)
 *
 * Ekubo is a concentrated liquidity DEX on Starknet.
 * TVL is calculated by querying tBTC balance at the market contract.
 *
 * Data source: Direct Starknet RPC balanceOf call
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/ekubo/index.js
 */

/**
 * Ekubo market contract that holds all liquidity
 */
export const EKUBO_MARKET: Partial<Record<Chain, string>> = {
  [Chain.STARKNET]:
    '0x00000005dd3d2f4429af886cd1a3b08289dbcea99a294197e9eb43b0e0325b4b',
}
