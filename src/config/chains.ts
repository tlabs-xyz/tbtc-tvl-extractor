import { fallback, http, type Transport } from 'viem'

import { Chain } from '../types/index.js'

const alchemyApiKey = process.env.ALCHEMY_API_KEY?.trim()

function getAlchemyRpcUrl(network: 'eth-mainnet' | 'arb-mainnet' | 'base-mainnet' | 'opt-mainnet'): string | undefined {
  if (!alchemyApiKey) return undefined
  return `https://${network}.g.alchemy.com/v2/${alchemyApiKey}`
}

export interface ChainConfig {
  name: string
  chainId: number
  rpcUrl: string
  /** Secondary public RPC used when primary is rate-limited (CI / shared endpoints) */
  fallbackRpcUrl?: string
  isEVM: boolean
}

export function getConfiguredRpcEndpoints(chain: Chain): string[] {
  const config = CHAIN_CONFIGS[chain]
  if (!config.isEVM) return []
  return config.fallbackRpcUrl
    ? [config.rpcUrl, config.fallbackRpcUrl]
    : [config.rpcUrl]
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
    return fallback([primary, http(config.fallbackRpcUrl, opts)], {
      rank: false
    })
  }
  return primary
}

export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  [Chain.ETHEREUM]: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC || getAlchemyRpcUrl('eth-mainnet') || 'https://eth.llamarpc.com',
    fallbackRpcUrl: process.env.ETHEREUM_FALLBACK_RPC,
    isEVM: true
  },
  [Chain.ARBITRUM]: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC || getAlchemyRpcUrl('arb-mainnet') || 'https://arb1.arbitrum.io/rpc',
    isEVM: true
  },
  [Chain.BASE]: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC || getAlchemyRpcUrl('base-mainnet') || 'https://mainnet.base.org',
    isEVM: true
  },
  [Chain.OPTIMISM]: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC || getAlchemyRpcUrl('opt-mainnet') || 'https://mainnet.optimism.io',
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
