import { Chain } from '../../types/index.js'

/**
 * Vesu Protocol Configuration (Starknet)
 *
 * Vesu is a lending protocol on Starknet with singleton and V2 pool architecture.
 * tBTC deposits are held in the singleton contract and V2 pools.
 *
 * Data source: Direct Starknet RPC balanceOf calls
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/vesu/index.js
 */

export const VESU_SINGLETON: Partial<Record<Chain, string>> = {
  [Chain.STARKNET]: '0x000d8d6dfec4d33bfb6895de9f3852143a17c6f92fd2a21da3d6924d34870160'
}

// V1 Singleton Pool IDs (these are pool identifiers, not separate contracts)
// The singleton contract holds all assets - we query its tBTC balance
export const VESU_V1_POOLS: Partial<Record<Chain, string[]>> = {
  [Chain.STARKNET]: [
    '0x4dc4f0ca6ea4961e4c8373265bfd5317678f4fe374d76f3fd7135f57763bf28', // Vesu Genesis Pool
    '0x7f135b4df21183991e9ff88380c2686dd8634fd4b09bb2b5b14415ac006fe1d'  // Re7 USDC
  ]
}

// V2 Pools (separate contracts that hold assets directly)
export const VESU_V2_POOLS: Partial<Record<Chain, string[]>> = {
  [Chain.STARKNET]: [
    '0x451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5', // Vesu Prime
    '0x16afa342e0f0b1b8c8cc26b03f93af9ade7aa3298c4d2f9d6d17ee93e9b8df1'  // Re7 Prime
  ]
}

// Standard Starknet ERC20 ABI selector for balanceOf
// balance_of(account: felt252) -> (balance: u256)
export const BALANCE_OF_SELECTOR = '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'

// Default Starknet RPC endpoint (Lava provides free public access)
export const STARKNET_RPC_URL = process.env.STARKNET_RPC || 'https://rpc.starknet.lava.build'
