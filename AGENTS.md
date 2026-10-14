# चाय का चंदा — Chai Ka Chanda

> Smart Indian Chai Stall — Web3 USDC Payments on Arc Testnet

This is the **single source of truth** for the project. All active development lives in `/home/user/app/`.

---

## What This App Does

A full Web3 Indian Chai Stall storefront on Arc Testnet. Users browse a Desi menu (Cutting Chai, Kulhad Special, Masala Chai, Samosa, Kachori, Lassi, Aloo Paratha, Combo), add items to a cart, and pay with native USDC via `msg.value`. No ERC-20 approve step needed. The app is fully visible without a wallet — connect prompt only fires on "Place Order". All payments go to the owner wallet onchain.

---

## Deployed Contracts

- **TipJar v2** (CURRENT) — `0x338091a6bec44b57379d20f127867ba60859a43d` on Arc Testnet (Chain ID 5042002)
  - Explorer: https://explorer.testnet.arc.io/address/0x338091a6bec44b57379d20f127867ba60859a43d
  - Payment: native USDC via `msg.value` (18 decimals); `MINIMUM_TIP = 1e17`; no ERC-20 approve
  - Owner (deployer wallet): `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`
  - Source: `contracts/TipJar.sol`
  - ABI: `contracts/out/TipJar.sol/TipJar.json`
- **TipJar v1** (DEPRECATED) — `0xa19739640ad3cbdf37134a7873bf39236602ba7c`
  - Used ERC-20 transferFrom; replaced by v2; do not reference

---

## Live Deployments

- **Netlify**: https://chaikachanda.netlify.app (last deploy: Oct 12 2026, all features)
- **Hugging Face**: not yet connected

---

## Chain & Token Config

- Chain: Arc Testnet, Chain ID `5042002`
- RPC: `https://rpc.testnet.arc.network` (fallback: `https://rpc.testnet.arc.io`)
- Native asset: USDC (18 decimals in native view, 6 decimals in ERC-20 view)
- USDC precompile: `0x3600000000000000000000000000000000000000` (not used by v2; native msg.value only)
- Block explorer: `https://explorer.testnet.arc.io`
- WalletConnect Project ID: `13a1abd6837b2bc4e757f6c2255f1297` (hardcoded in `src/config.ts`)
- Faucet: https://faucet.circle.com

---

## Tech Stack

- Frontend: React 18, Vite 5, TypeScript, Tailwind CSS v3
- Web3: wagmi v2, viem v2, RainbowKit v2 (`@rainbow-me/rainbowkit@2.2.11`)
- Contracts: Solidity 0.8.28 + Foundry (forge build / forge test)
- Storage: `src/safe-storage.ts` — MemoryStorage fallback for Brave/blocked localStorage
- i18n: `src/i18n.ts` — Hindi (default) / English toggle, saved to localStorage
- Voice: `speechSynthesis` on all buttons, mute persisted to localStorage
- Chain reads: standalone `createPublicClient` (viem) → `rpc.testnet.arc.network`, decoupled from wallet provider
- Toasts: Sonner

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/TipJarApp.tsx` | Main app — entire storefront UI and Web3 logic |
| `src/components/QrScanner.tsx` | Camera QR scanner modal (fills wallet address field) |
| `src/config.ts` | wagmi + RainbowKit config, Arc Testnet chain, safeStorage |
| `src/safe-storage.ts` | Brave-safe localStorage fallback + wagmi cache purge on disconnect |
| `src/i18n.ts` | All Hindi/English strings + Strings interface |
| `src/onchain-facts.ts` | Chain facts, USDC address, RPC URLs |
| `src/onchain-money.ts` | USDC formatting helpers |
| `src/onchain-wait.ts` | Transaction receipt polling helpers |
| `src/main.tsx` | Entry point — RainbowKitProvider, WagmiProvider, QueryClientProvider |
| `contracts/TipJar.sol` | TipJar v2 contract source |

---

## Contract ABI (key functions)

```solidity
function tip(string name, string message) external payable   // msg.value = amount (18 dec)
function withdraw() external                                  // owner only
function getTotalCollected() external view returns (uint256)
function getTipsCount() external view returns (uint256)
function getRecentTips(uint256 count) external view returns (TipStruct[])
function getOwner() external view returns (address)
uint256 public constant MINIMUM_TIP = 1e17;                  // 0.1 USDC (18 dec)
```

---

## Native USDC Decimal Notes

Arc native USDC has **18 decimals** in `msg.value` / `getBalance`.
ERC-20 USDC has **6 decimals**.
Conversion: `native_value = erc20_amount * 1e12`
Menu prices (e.g. 0.25 USDC) → multiply by `1e18` for `msg.value`.

---

## Key Architecture Decisions

1. **Open storefront**: entire 3-column layout visible without wallet. Wallet connect fires only on "Place Order" CTA.
2. **Decoupled reads**: `arcPublicClient` (standalone viem) polls contract every 3s independently of wallet state — stats work on any browser/network.
3. **Per-wallet privacy**: `myOrders` session array is keyed to the connected address, cleared on wallet switch or disconnect. No other users' data ever rendered.
4. **Brave force-purge**: on disconnect, `purgeWagmiCache()` clears all wagmi localStorage keys. `accountsChanged → []` listener triggers wagmi `disconnect()` directly.
5. **Wrong-chain guard**: `wallet_switchEthereumChain` with `wallet_addEthereumChain` fallback (error code 4902).
6. **Brave 12s fallback**: `setTimeout(12_000)` runs parallel to `useWaitForTransactionReceipt` — force-completes on Brave Shield delays.
7. **3-column desktop layout**: `max-w-7xl`, `lg:grid-cols-3`. Mobile: menu column first (`order-1`), left second (`order-2`), cart third (`order-3`). Sticky bottom cart bar on mobile.

---

## To Run Locally

```bash
bun install
bun run dev        # starts Vite dev server on :5173
```

## To Build

```bash
bun run build      # outputs to dist/
```

## To Run Checks

```bash
bash /home/user/arc-studio-helpers/check.sh
```

## To Build Contracts

```bash
cd contracts && forge build
```
