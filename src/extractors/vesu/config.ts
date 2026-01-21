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
// Source: https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/vesu/index.js
export const VESU_V2_POOLS: Partial<Record<Chain, string[]>> = {
  [Chain.STARKNET]: [
    '0x451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5', // Vesu Prime Pool
    '0x2eef0c13b10b487ea5916b54c0a7f98ec43fb3048f60fdeedaf5b08f6f88aaf', // Re7 USDC Prime Pool
    '0x3976cac265a12609934089004df458ea29c776d77da423c96dc761d09d24124', // Re7 USDC Core Pool
    '0x3a8416bf20d036df5b1cf3447630a2e1cb04685f6b0c3a70ed7fb1473548ecf', // Re7 xBTC Pool
    '0x73702fce24aba36da1eac539bd4bae62d4d6a76747b7cdd3e016da754d7a135', // Re7 USDC Stable Core Pool
    '0x5c03e7e0ccfe79c634782388eb1e6ed4e8e2a013ab0fcc055140805e46261bd'  // Re7 USDC Frontier Pool
  ]
}

// Standard Starknet ERC20 ABI selector for balanceOf
// balance_of(account: felt252) -> (balance: u256)
export const BALANCE_OF_SELECTOR = '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'

// Default Starknet RPC endpoint (Lava provides free public access)
export const STARKNET_RPC_URL = process.env.STARKNET_RPC || 'https://rpc.starknet.lava.build'
