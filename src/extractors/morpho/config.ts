import { Chain } from '../../types/index.js'

/**
 * Morpho Protocol Configuration
 *
 * Morpho Blue is a permissionless lending protocol. All markets are managed by
 * a single singleton contract that custodies collateral and loan assets, so
 * tBTC TVL across every Morpho market (e.g. the tBTC/USDC market) is the tBTC
 * balance held by the singleton.
 *
 * Data source: Direct RPC balanceOf call
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/morpho-blue/index.js
 * Market URL: https://app.morpho.org/ethereum/market/0xe4cfbee9af4ad713b41bf79f009ca02b17c001a0c0e7bd2e6a89b1111b3d3f08/tbtc-usdc
 */

/**
 * Morpho Blue singleton contract that holds all market assets
 */
export const MORPHO_BLUE: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb'
}
