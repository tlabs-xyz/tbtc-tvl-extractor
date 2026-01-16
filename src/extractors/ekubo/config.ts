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
  [Chain.STARKNET]: '0x00000005dd3d2f4429af886cd1a3b08289dbcea99a294197e9eb43b0e0325b4b'
}

// Starknet ERC20 balance_of selector (starknet_keccak("balance_of"))
export const BALANCE_OF_SELECTOR = '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'

// Default Starknet RPC endpoint
export const STARKNET_RPC_URL = process.env.STARKNET_RPC || 'https://rpc.starknet.lava.build'
