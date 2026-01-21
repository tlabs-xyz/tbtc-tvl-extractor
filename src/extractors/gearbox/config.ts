import { Chain } from '../../types/index.js'

/**
 * Gearbox Protocol Configuration
 *
 * Gearbox is a leverage protocol that allows users to leverage their positions.
 * The tBTC pool is an ERC-4626 vault (PoolV3) where users can lend tBTC.
 *
 * Data source: Direct RPC calls to ERC-4626 vault
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/gearbox/index.js
 * Pool URL: https://app.gearbox.fi/pools/1/0xf791ecc5f2472637eac9dfe3f7894c0b32c32bdf
 */

export interface GearboxPool {
  address: string
  name: string
}

/**
 * Gearbox tBTC pools per chain
 * These are ERC-4626 vaults (PoolV3) that hold tBTC deposits
 */
export const GEARBOX_TBTC_POOLS: Partial<Record<Chain, GearboxPool[]>> = {
  [Chain.ETHEREUM]: [
    {
      address: '0x7354ec6e852108411e681d13e11185c3a2567981',
      name: 'Chaos Labs tBTC v3 Pool'
    },
    {
      address: '0xf791ecc5f2472637eac9dfe3f7894c0b32c32bdf',
      name: 'Re7 tBTC Pool'
    }
  ]
}
