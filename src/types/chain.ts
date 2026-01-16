export enum Chain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  OPTIMISM = 'optimism',
  STARKNET = 'starknet',
  SUI = 'sui'
}

export const EVM_CHAINS = [
  Chain.ETHEREUM,
  Chain.ARBITRUM,
  Chain.BASE,
  Chain.OPTIMISM
] as const

export const NON_EVM_CHAINS = [
  Chain.STARKNET,
  Chain.SUI
] as const

export type EVMChain = typeof EVM_CHAINS[number]
export type NonEVMChain = typeof NON_EVM_CHAINS[number]
