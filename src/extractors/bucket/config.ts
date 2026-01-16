/**
 * Bucket Protocol Configuration (Sui)
 *
 * Bucket is a CDP (Collateralized Debt Position) protocol on Sui.
 * Users deposit collateral (including tBTC) to mint BUCK stablecoin.
 *
 * Data source: Direct Sui RPC calls
 * Reference: https://github.com/Bucket-Protocol/bucket-protocol-sdk
 */

// Sui RPC endpoint
export const SUI_RPC_URL = process.env.SUI_RPC || 'https://sui-rpc.publicnode.com'

// Bucket Protocol mainnet object ID
export const BUCKET_PROTOCOL_ID = '0x9e3dab13212b27f5434416939db5dec6a319d15b89a84fd074d03ece6350d3df'

// tBTC coin type on Sui
export const SUI_TBTC_COIN_TYPE = '0x77045f1b9f811a7a8fb9ebd085b5b0c55c5cb0d1520ff55f7037f89b5da9f5f1::TBTC::TBTC'
