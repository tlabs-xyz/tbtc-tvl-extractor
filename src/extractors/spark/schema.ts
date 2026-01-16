import { z } from 'zod'

export const SparkMarketSchema = z.object({
  markets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    inputToken: z.object({
      id: z.string(),
      symbol: z.string(),
      decimals: z.number()
    }),
    inputTokenBalance: z.string(),
    inputTokenPriceUSD: z.string(),
    totalValueLockedUSD: z.string(),
    totalDepositBalanceUSD: z.string()
  }))
})

export type SparkMarketData = z.infer<typeof SparkMarketSchema>
