## Testnet Demo Account

This repo ships with a **public Sepolia test account** so anyone can try the full system end‑to‑end. Do **not** send any real assets to it.

- Network: **Sepolia**
- Test account private key (for demo only):  
  `50a1978d6fca900d0ea122307860b26b33f8eb8fb57d68fb66975d75e1834a05`
- Notes:
  - This account is pre‑granted about 1000 carbon credits (allowance) in `CarbonTrader` so you can create and settle auctions.
  - The key is intentionally public and **must never** be reused outside of testnets.
  - Import it into MetaMask / Rabby as an additional account and switch the network to Sepolia before using the dApp.

### Suggested Quick Demo Flow

1. **Import the demo account**
   - In your wallet (MetaMask / Rabby), choose “Import account” and paste the test private key.
   - Switch network to **Sepolia** and make sure you have a small amount of test ETH for gas.

2. **Run or open the frontend**
   - Local:
     ```bash
     cd carbontrader-prime
     npm install
     npm run dev
     ```
     Then visit `http://localhost:5173` (or the URL Vite prints).
   - Or open the Vercel deployment URL for this repo.

3. **Connect your wallet**
   - Click `Connect Wallet` on the landing page and connect the imported Sepolia account.

4. **Get USDT (bid token)**
   - Go to `Dashboard` → in the `USDT Balance` card click `Top Up`.
   - In the `Acquire USDT` modal:
     - Either send a small `Amount of ETH to Spend` via `Swap ETH for USDT` (`TokenSale.buyTokens()`), or
     - Click `Claim Daily Faucet` to call `TokenFaucet.claim()` and receive 1000 test USDT once every 24h.

5. **Create an auction (seller)**
   - Switch to `Market` → `New Listing`.
   - A `Trade ID` like `CT-100001` is auto‑generated.
   - Fill:
     - `Amount (Credits)` – amount of carbon credits to list (e.g. `100`).
     - `Starting Total Price (USDT)` – total starting ask (e.g. `1000`).
     - Optional: `Reserve Price (Total USDT)` and `Buy Now Price (Total USDT)`.
   - Click `Create Listing` and wait for confirmation. The auction card will appear in `Market`.

6. **Bid and settle**
   - With a second Sepolia account as **buyer**:
     - Connect that account, go to `Market`, choose the auction, click `Place Bid` and enter your total bid (USDT).
     - If a buy‑now price is set, you can click `Buy Now` to settle immediately.
   - As **seller**:
     - If the auction is still running with at least one bid, click `End Auction Now` (or use `Dashboard → My Auctions → End Early`) to call `sellerFinalizeEarly`.
     - After end time with a highest bid, click `Settle Auction` to call `finalizeAuctionAndTransferCarbon`.

7. **Refunds & withdrawals**
   - Buyers:
     - Use `Dashboard → My Bids` and click `Refund Deposit` on lost / finalized / reserve‑not‑met auctions to get back your deposit.
   - Sellers:
     - In `Dashboard`, the `Pending Revenue` card shows withdrawable USDT. Click `Claim` to call `withdrawAuctionAmount()`.

8. **Admin features (optional)**
   - Connect with the contract owner account (`owner()` of `CarbonTrader`) to see the `Admin` tab.
   - There you can:
     - Issue/destroy carbon credits.
     - Manage whitelist / blacklist & toggle whitelist mode.
     - Configure platform fee basis points.
     - Batch finalize ended trades.
     - Use the Accounts Console to inspect ETH/USDT/carbon/frozen/withdrawable balances for any set of addresses.

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

