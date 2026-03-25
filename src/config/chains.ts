import { fallback, http, type Transport } from 'viem'

import { Chain } from '../types/index.js'

export interface ChainConfig {
  name: string
  chainId: number
  rpcUrl: string
  /** Secondary public RPC used when primary is rate-limited (CI / shared endpoints) */
  fallbackRpcUrl?: string
  isEVM: boolean
}

/**
 * HTTP transport with optional fallback for EVM chains (reduces CI flakiness).
 */
export function createEvmHttpTransport(chain: Chain, timeoutMs?: number): Transport {
  const config = CHAIN_CONFIGS[chain]
  if (!config.isEVM) {
    throw new Error(`Not an EVM chain: ${chain}`)
  }
  const t = timeoutMs ?? 10000
  const opts = { timeout: t }
  const primary = http(config.rpcUrl, opts)
  if (config.fallbackRpcUrl) {
    return fallback([primary, http(config.fallbackRpcUrl, opts)])
  }
  return primary
}

export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  [Chain.ETHEREUM]: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    fallbackRpcUrl: 'https://ethereum-rpc.publicnode.com',
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
