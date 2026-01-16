import { z } from 'zod'

export const AaveReserveSchema = z.object({
  reserves: z.array(z.object({
    id: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    underlyingAsset: z.string(),
    totalLiquidity: z.string(),
    availableLiquidity: z.string(),
    totalATokenSupply: z.string(),
    liquidityRate: z.string(),
    variableBorrowRate: z.string(),
    price: z.object({
      priceInEth: z.string()
    }).optional()
  }))
})

export type AaveReserveData = z.infer<typeof AaveReserveSchema>
