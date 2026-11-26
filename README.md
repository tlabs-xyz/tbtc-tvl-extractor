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
  { "protocol": "Aave", "chain": "Ethereum", "tvl": "1746.73" },
  { "protocol": "Uniswap", "chain": "Arbitrum", "tvl": "8.18" }
]
```

## CI/CD

GitHub Actions runs daily at 8am UTC, publishing to GitHub Pages.
Requires `THEGRAPH_API_KEY` and `ALCHEMY_API_KEY` secrets.

The `staging-tvl-pilot` branch runs a separate CI workflow for Curve TVL on Ethereum,
Base, and Arbitrum. The job uses `STAGING_RPC_PROXY_TOKEN` from the branch's
GitHub environment, rejects other RPC endpoints, and uploads
`staging-proxy-extraction.json`. It does not publish to GitHub Pages.
