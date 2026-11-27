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

The scheduled workflow keeps its direct EVM routes unless
`TVL_EVM_RPC_PROXY_ENABLED` is `true`. Before enabling it, provision a dedicated
three-chain proxy token as the `TVL_EVM_RPC_PROXY_TOKEN` GitHub Actions secret.
Enabled runs send Ethereum, Arbitrum, and Base mainnet requests to `rpc-proxy`
with Bearer auth and no direct fallback. Other chains are unchanged.

For rollback, unset `TVL_EVM_RPC_PROXY_ENABLED`. The next run restores the
prior direct routes and Ethereum fallback. Keep the direct credential and
fallback configuration until rollback is no longer needed. Verify an actual
scheduled extraction before considering retirement of the old key.
