# CarbonTraderV2

A full-stack carbon-credit auction prototype built with Solidity, Foundry, React, and ethers.js. The project models the complete asset path from issuing carbon allowances, freezing credits for a listing, collecting ERC-20 bids, settling an auction, and letting participants withdraw or reclaim funds.

This repository is a portfolio and learning project. It demonstrates contract state design and failure-path testing; it is not an audited production carbon market.

## What the system implements

- Carbon-credit balances with issue, destroy, freeze, and unfreeze operations.
- Auction creation with start price, reserve price, buy-now price, and end time.
- ERC-20 deposits, bidding, settlement, bidder refunds, and seller withdrawals.
- Whitelist and blacklist controls plus configurable platform fees.
- Pull-based withdrawals so settlement does not depend on an immediate external payment.
- A React interface for market listings, account balances, bidding, refunds, and administration.

## Core transaction flow

```text
Admin issues credits
        |
Seller creates auction -> credits move from available to frozen
        |
Buyer approves ERC-20 -> deposits bid into the contract
        |
Auction finalizes
        |
        +-> winning buyer receives carbon credits
        +-> losing bidders reclaim deposits
        +-> seller withdraws proceeds
        +-> platform fee remains accounted for
```

The main invariant is that available credits, frozen credits, deposits, and withdrawable proceeds change together with the auction state. A failed or cancelled path must not create credits or strand bidder funds.

## Architecture

```text
React / Vite dApp
      |
   ethers.js
      |
CarbonTrader + ERC20Mock + TokenSale + TokenFaucet
      |
Foundry tests and deployment scripts
```

- `Foundry-CarbonTrade/src/CarbonTraderStorage.sol`: storage, events, errors, access rules, and account controls.
- `Foundry-CarbonTrade/src/CarbonTrader.sol`: allowance and auction business logic.
- `Foundry-CarbonTrade/src/TokenSale.sol`: test ETH-to-token acquisition flow.
- `Foundry-CarbonTrade/src/TokenFaucet.sol`: rate-limited test-token faucet.
- `carbontrader-prime/`: the primary React client.
- `frontend/`: an earlier interface retained as a reference implementation.

## Verification

The Foundry suite exercises both state transitions and failure paths, including:

- issuing, freezing, unfreezing, and destroying allowances;
- preventing unauthorized allowance destruction;
- creating auctions and recording seller state;
- ERC-20 approval, deposits, refunds, and contract balances;
- time-dependent finalization and transfer of carbon credits.

Run the contract checks with:

```bash
cd Foundry-CarbonTrade
forge build
forge test -vv
```

## Security and scope

- No private key is distributed in this repository.
- Use a fresh local Anvil account or a dedicated Sepolia test account that never holds real assets.
- Keep `.env`, RPC credentials, and deployment keys outside version control.
- The mock token, faucet, and testnet deployment are development aids, not production financial infrastructure.
- The contracts have not undergone an independent security audit.

---

## Project Layout

- `Foundry-CarbonTrade/` – Foundry contracts and Foundry‑style README:
  - `src/CarbonTraderStorage.sol` – storage layout, events, errors, access control, whitelist/blacklist.
  - `src/CarbonTrader.sol` – main business logic: carbon credit balances, auction, reserve/buy‑now, fees, whitelist/blacklist, early finalize, cancel trade.
  - `src/TokenSale.sol` – ETH → USDTMock sale contract.
  - `src/TokenFaucet.sol` – simple faucet; each address can claim a fixed amount of test tokens every 24 hours.
  - `script/deploy.s.sol` – deployment script; deploys `ERC20Mock`, `CarbonTrader`, `TokenSale`, `TokenFaucet` and writes their addresses to `deployments/latest.json`.
  - `deployments/latest.json` – latest deployment addresses; used by the frontend as default config.
  - `test/CarbonTraderTest.sol` – core unit tests for on‑chain logic.
- `carbontrader-prime/` – React + Vite frontend:
  - Reads contract addresses from `../Foundry-CarbonTrade/deployments/latest.json`.
  - Connects via `ethers` v6 and implements the full UX described above.
- `frontend/` – original single‑page prototype (kept for reference; the React app is the main UI now).

For a detailed contract‑level explanation (errors, invariants, security model), see `Foundry-CarbonTrade/README.md`.

---

## Local Development (Quick Reference)

Build and test contracts:

```bash
cd Foundry-CarbonTrade
forge build
forge test
```

Run a local chain:

```bash
anvil
```

Deploy to a network (example: Sepolia via env vars):

```bash
cd Foundry-CarbonTrade
source .env   # export INFURA_RPC_URL, PRIVATE_KEY

forge script script/deploy.s.sol:DeployScript \
  --rpc-url $INFURA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --chain-id 11155111 \
  --broadcast -vvvv
```

Start the React frontend:

```bash
cd carbontrader-prime
npm install
npm run dev
```

