/**
 * Ember Protocol Configuration (Sui)
 *
 * Ember is a structured vaults protocol on Sui, incubated by Bluefin/Bluewater Labs.
 * Users can deposit assets including tBTC into non-custodial vaults managed by curators.
 *
 * Data source: Bluefin Vaults API (used by DefiLlama)
 * tBTC vault: MEV Capital BTC Vault with tBTC as collateral
 */

// Ember/Bluefin Vaults API endpoint
export const EMBER_VAULTS_API = 'https://vaults.api.sui-prod.bluefin.io/api/v1/vaults'

// tBTC vault object ID on Sui (MEV Capital BTC Vault)
export const EMBER_TBTC_VAULT_ID = '0x323578c2b24683ca845c68c1e2097697d65e235826a9dc931abce3b4b1e43642'

// tBTC coin type on Sui
export const SUI_TBTC_COIN_TYPE = '0x77045f1b9f811a7a8fb9ebd085b5b0c55c5cb0d1520ff55f7037f89b5da9f5f1::TBTC::TBTC'

// Sui RPC endpoint (fallback for on-chain queries)
export const SUI_RPC_URL = process.env.SUI_RPC || 'https://sui-rpc.publicnode.com'
