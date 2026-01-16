import { z } from 'zod'

// Paperclip Labs Compound V3 Community Subgraph schema
// https://github.com/papercliplabs/compound-v3-subgraph

export const CollateralTokenSchema = z.object({
  collateralTokens: z.array(z.object({
    id: z.string(),
    token: z.object({
      address: z.string(),
      symbol: z.string(),
      decimals: z.number()
    }),
    market: z.object({
      id: z.string(),
      configuration: z.object({
        baseToken: z.object({
          token: z.object({
            symbol: z.string()
          })
        })
      })
    })
  }))
})

export const MarketCollateralBalanceSchema = z.object({
  marketCollateralBalance: z.object({
    id: z.string(),
    balance: z.string(),
    balanceUsd: z.string(),
    lastUpdateBlockNumber: z.string()
  }).nullable()
})

export type CollateralTokenData = z.infer<typeof CollateralTokenSchema>
export type MarketCollateralBalanceData = z.infer<typeof MarketCollateralBalanceSchema>
