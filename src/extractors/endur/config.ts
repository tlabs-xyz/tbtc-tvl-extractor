import { Chain } from '../../types/index.js'

/**
 * Endur Protocol Configuration (Starknet)
 *
 * Endur is a liquid staking protocol on Starknet that offers LST tokens
 * for various assets including tBTC. Uses ERC4626 vault architecture.
 *
 * Data source: ERC4626 total_assets() call via starknet.js
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/endur/index.js
 */

export interface EndurVault {
  vaultAddress: string
  name: string
}

/**
 * Endur tBTC vault on Starknet (xTBTC)
 * Query total_assets() to get TVL
 */
export const ENDUR_TBTC_VAULTS: Partial<Record<Chain, EndurVault[]>> = {
  [Chain.STARKNET]: [
    {
      // xTBTC vault - holds staked tBTC
      vaultAddress: '0x043a35c1425a0125ef8c171f1a75c6f31ef8648edcc8324b55ce1917db3f9b91',
      name: 'Endur xTBTC Vault'
    }
  ]
}

// Default Starknet RPC endpoint
export const STARKNET_RPC_URL = process.env.STARKNET_RPC || 'https://rpc.starknet.lava.build'
