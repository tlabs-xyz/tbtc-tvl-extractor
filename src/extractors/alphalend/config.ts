/**
 * Bluefin/AlphaLend Protocol Configuration (Sui)
 *
 * Bluefin is a DEX on Sui with:
 * - AlphaLend: Lending protocol supporting tBTC
 * - Spot pools: AMM pools for tBTC trading
 *
 * Data sources:
 * - Lending: Direct Sui RPC calls (dynamic field queries)
 * - Spot: Bluefin Swap API
 *
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

// Bluefin Swap API endpoint for spot pools
export const BLUEFIN_API_URL = 'https://swap.api.sui-prod.bluefin.io/api/v1/pools/info'

// tBTC token symbols to match in spot pools
export const TBTC_SYMBOLS = ['tBTC', 'TBTC']
