# tBTC TVL Extractor

Extracts TVL (Total Value Locked) data for tBTC across DeFi protocols and chains.

## Setup

```bash
npm install
cp .env.example .env  # Add your THEGRAPH_API_KEY and ALCHEMY_API_KEY
```

## Usage

```bash
npm run dev      # Development
npm run extract  # Production
```

## Output

Generates `data/output/tvl.json`:

```json
[
  {
    "protocol": "Aave",
    "chain": "Ethereum",
    "tvl": "1746.73",
    "updatedAt": "2026-09-25T08:12:18.428Z"
  },
  { "protocol": "Uniswap", "chain": "Arbitrum", "tvl": "-1" }
]
```

`tvl` is the quantity of tracked tBTC (18-decimal amounts formatted as a decimal
string), not USD or all-token protocol TVL. `updatedAt` is the successful
observation time in UTC. Failed, skipped, or unsupported extraction remains `-1`
and has no observation timestamp. A measured zero remains `"0"`. Consumers should
show unavailable/stale data separately from zero; the daily job can be delayed.

AlphaLend counts lending supply (available plus borrowed tBTC) only. Bluefin DEX
liquidity is a separate product and is not included in the AlphaLend row.

Starknet extractors share a bounded RPC client and pin each protocol's reads to
one block. Any failed read rejects the entire extraction, preventing partial
balances from being published as valid TVL. Vesu discovers verified V2 tBTC pools
from its [official inventory](https://api.vesu.xyz/pools), including new markets,
and counts the V1 singleton once. Discovery failure is also unavailable.

Set `STARKNET_RPC` to override the default Cartridge mainnet endpoint, or set the
GitHub repository variable `STARKNET_RPC` for the scheduled workflow. The retired
Lava endpoint must not be used. For local validation run `npm test` and
`npx tsc --noEmit`.

## CI/CD

GitHub Actions runs daily at 8am UTC, publishing to GitHub Pages.
Requires `THEGRAPH_API_KEY` and `ALCHEMY_API_KEY` secrets.
