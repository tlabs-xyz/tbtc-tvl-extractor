import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync('data/use-tbtc-protocols.json', 'utf8'))
const output = JSON.parse(readFileSync('pilot-output/tvl.json', 'utf8'))
const skipped = new Set([
  'Ethereum/Asymmetry', 'Ethereum/Merkl', 'Arbitrum/Nerite',
  'Starknet/Starknet Earn', 'Starknet/0D', 'Sui/Bluefin'
])
type Row = { chain: string; protocol: string; tvl: string }
const label = ({ chain, protocol }: Row) => `${chain}/${protocol}`
const rows = new Map((output as Row[]).map(row => [label(row), row.tvl]))
if (rows.size !== input.length || output.length !== input.length) {
  throw new Error('Pilot output does not contain exactly one row per input')
}
const failures = []
for (const entry of input) {
  const key = label(entry)
  const tvl = rows.get(key)
  if (skipped.has(key) && tvl === '-1') continue
  if (typeof tvl !== 'string' || !/^\d+(\.\d+)?$/.test(tvl)) failures.push(key)
}
if (failures.length) throw new Error(`Missing or failed extraction: ${failures.join(', ')}`)
console.log(`Verified ${output.length} TVL rows across ${new Set((output as Row[]).map(row => row.chain)).size} chains`)
