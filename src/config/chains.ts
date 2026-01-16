import { Chain } from '../types/index.js'

export interface ChainConfig {
  name: string
  chainId: number
  rpcUrl: string
  isEVM: boolean
}

export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  [Chain.ETHEREUM]: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    isEVM: true
  },
  [Chain.ARBITRUM]: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    isEVM: true
  },
  [Chain.BASE]: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC || 'https://mainnet.base.org',
    isEVM: true
  },
  [Chain.OPTIMISM]: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io',
    isEVM: true
  },
  [Chain.STARKNET]: {
    name: 'Starknet',
    chainId: 0, // Starknet doesn't use EVM chain IDs
    rpcUrl: '',
    isEVM: false
  },
  [Chain.SUI]: {
    name: 'Sui',
    chainId: 0,
    rpcUrl: '',
    isEVM: false
  }
}
