import { Chain } from '../types/index.js'

export const TBTC_ADDRESSES: Record<Chain, string> = {
  [Chain.ETHEREUM]: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
  [Chain.ARBITRUM]: '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40',
  [Chain.BASE]: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
  [Chain.OPTIMISM]: '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40',
  [Chain.STARKNET]: '0x04daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32f',
  // Sui uses full coin type format: package_id::module::struct
  [Chain.SUI]: '0x77045f1b9f811a7a8fb9ebd085b5b0c55c5cb0d1520ff55f7037f89b5da9f5f1::TBTC::TBTC'
}

export const TBTC_DECIMALS = 18 // Standard for EVM chains
