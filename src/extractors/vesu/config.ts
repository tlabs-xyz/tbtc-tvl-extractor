import { Chain } from '../../types/index.js'

// V1 pools share one contract; query its tBTC balance exactly once.
export const VESU_SINGLETON: Partial<Record<Chain, string>> = {
  [Chain.STARKNET]:
    '0x000d8d6dfec4d33bfb6895de9f3852143a17c6f92fd2a21da3d6924d34870160',
}

// Official inventory includes newly deployed V2 pools and their supported assets.
export const VESU_POOLS_API = 'https://api.vesu.xyz/pools'
