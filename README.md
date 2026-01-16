# tBTC TVL Extractor

Extracts TVL (Total Value Locked) data for tBTC across DeFi protocols and chains.

## Setup

```bash
npm install
cp .env.example .env  # Add your THEGRAPH_API_KEY
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
  { "protocol": "Aave", "chain": "Ethereum", "tvl": "1746.73" },
  { "protocol": "Uniswap", "chain": "Arbitrum", "tvl": "8.18" }
]
```

## CI/CD

GitHub Actions runs daily at 8am UTC, publishing to GitHub Pages.
Requires `THEGRAPH_API_KEY` secret.
