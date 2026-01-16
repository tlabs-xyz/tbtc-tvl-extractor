import { Chain } from '../../types/index.js'

/**
 * Endur Protocol Configuration (Starknet)
 *
 * Endur is a liquid staking protocol on Starknet that offers LST tokens
 * for various assets including tBTC.
 *
 * Data source: Direct Starknet RPC balanceOf calls (tBTC held by vault)
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/endur/index.js
 */

export interface EndurVault {
  vaultAddress: string
  name: string
}

/**
 * Endur tBTC vault on Starknet
 * Query tBTC balance held by the vault contract
 */
export const ENDUR_TBTC_VAULTS: Partial<Record<Chain, EndurVault[]>> = {
  [Chain.STARKNET]: [
    {
      vaultAddress: '0x43a35c1425a0125ef8c171f1a75c6f31ef8648edcc8324b55ce1917db3f9b91',
      name: 'Endur tBTC Vault'
    }
  ]
}

// Starknet ERC20 balance_of selector (starknet_keccak("balance_of"))
export const BALANCE_OF_SELECTOR = '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'

// Default Starknet RPC endpoint
export const STARKNET_RPC_URL = process.env.STARKNET_RPC || 'https://rpc.starknet.lava.build'
