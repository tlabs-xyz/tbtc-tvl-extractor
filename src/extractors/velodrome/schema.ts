import { z } from 'zod'

// Velodrome uses Messari DEX AMM schema
export const VelodromePoolSchema = z.object({
  liquidityPools: z.array(z.object({
    id: z.string(),
    name: z.string(),
    inputTokens: z.array(z.object({
      id: z.string(),
      decimals: z.number()
    }))
  }))
})

export type VelodromePoolData = z.infer<typeof VelodromePoolSchema>
