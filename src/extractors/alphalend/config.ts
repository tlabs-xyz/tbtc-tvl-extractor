/**
 * AlphaLend Protocol Configuration (Sui)
 *
 * AlphaLend is a lending protocol on Sui that supports multiple collateral types
 * including tBTC.
 *
 * Data source: Direct Sui RPC calls (dynamic field queries)
 * Reference: DefiLlama adapter https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/bluefin-alphalend/index.js
 */

// Sui RPC endpoint
export const SUI_RPC_URL = process.env.SUI_RPC || 'https://sui-rpc.publicnode.com'

// AlphaLend Markets Container object ID
// Source: DefiLlama adapter
export const ALPHALEND_MARKETS_CONTAINER = '0x2326d387ba8bb7d24aa4cfa31f9a1e58bf9234b097574afb06c5dfb267df4c2e'

// Market type pattern for dynamic field queries
export const ALPHALEND_MARKET_TYPE = '0x8f8ded194f7a4d68950e44c9ff83a041b4a1c7cbbe06b188523915b6eba62c7a::market::Market'

// tBTC coin type on Sui
export const SUI_TBTC_COIN_TYPE = '0x77045f1b9f811a7a8fb9ebd085b5b0c55c5cb0d1520ff55f7037f89b5da9f5f1::TBTC::TBTC'
