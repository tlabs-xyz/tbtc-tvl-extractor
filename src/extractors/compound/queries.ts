import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const GetTBTCCollateralTokensQuery = readFileSync(
  join(__dirname, 'query.graphql'),
  'utf-8'
)

// Query to get market collateral balance by ID
// The ID format is: collateralToken.id + "42414c" (hex for "BAL")
export const GetMarketCollateralBalanceQuery = `
  query GetMarketCollateralBalance($id: ID!) {
    marketCollateralBalance(id: $id) {
      id
      balance
      balanceUsd
      lastUpdateBlockNumber
    }
  }
`
