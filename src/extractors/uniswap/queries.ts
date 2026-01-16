import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const GetTBTCPoolsQuery = readFileSync(
  join(__dirname, 'query.graphql'),
  'utf-8'
)
