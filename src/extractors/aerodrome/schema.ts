import { z } from 'zod'

// Aerodrome uses same schema as Uniswap V3 but TVL values are decimal strings
export const AerodromePoolSchema = z.object({
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
    // Aerodrome returns these as decimal strings (e.g., "7.231732667458841728")
    totalValueLockedToken0: z.string(),
    totalValueLockedToken1: z.string(),
    feeTier: z.string()
  }))
})

export type AerodromePoolData = z.infer<typeof AerodromePoolSchema>
