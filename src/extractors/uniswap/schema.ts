import { z } from 'zod'

// Official Uniswap V3 subgraph schema (used across all chains)
export const UniswapPoolSchema = z.object({
  pools: z.array(z.object({
    id: z.string(),
    token0: z.object({
      id: z.string(),
      symbol: z.string(),
      decimals: z.string()
    }),
    token1: z.object({
      id: z.string(),
      symbol: z.string(),
      decimals: z.string()
    }),
    totalValueLockedToken0: z.string(),
    totalValueLockedToken1: z.string(),
    liquidity: z.string(),
    feeTier: z.string()
  }))
})

export type UniswapPoolData = z.infer<typeof UniswapPoolSchema>
