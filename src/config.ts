/**
 * wagmi + RainbowKit config — full wallet list including WalletConnect.
 *
 * Arc Testnet is defined as a custom chain so RainbowKit can show
 * "Switch network" and add it via wallet_addEthereumChain automatically.
 *
 * Storage is provided by safeStorage (src/safe-storage.ts) which falls back
 * to an in-memory store when Brave Shields blocks localStorage.
 */

import { http, createStorage, fallback } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  braveWallet,
  rabbyWallet,
  coinbaseWallet,
  rainbowWallet,
  okxWallet,
  bitgetWallet,
  trustWallet,
  injectedWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { getUsdc, requireChain } from '@/onchain-facts'
import { safeStorage } from './safe-storage'
import { registerChain } from './tracing'

// ── Arc Testnet custom chain ──────────────────────────────────────────────────

const ARC_CHAIN_ID = 5042002
const arcFact = requireChain(ARC_CHAIN_ID)
const arcUsdc = getUsdc(ARC_CHAIN_ID)

// Two RPC endpoints for failover — primary from onchain-facts, backup known public node
const ARC_RPC_PRIMARY   = arcFact.rpcUrls[0] ?? 'https://rpc.testnet.arc.network'
const ARC_RPC_SECONDARY = 'https://rpc.testnet.arc.io'

export const arcTestnetChain = {
  id: ARC_CHAIN_ID,
  name: arcFact.name,
  nativeCurrency: {
    name: arcUsdc?.symbol ?? arcFact.nativeCurrency.symbol,
    symbol: arcUsdc?.symbol ?? arcFact.nativeCurrency.symbol,
    decimals: arcFact.nativeCurrency.decimals,
  },
  rpcUrls: {
    default: { http: [ARC_RPC_PRIMARY, ARC_RPC_SECONDARY] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: arcFact.explorerBase },
  },
  testnet: true,
} as const

// ── wagmi + RainbowKit config ─────────────────────────────────────────────────

registerChain(ARC_CHAIN_ID, ARC_RPC_PRIMARY)

const PROJECT_ID = '13a1abd6837b2bc4e757f6c2255f1297'

export const config = getDefaultConfig({
  appName: 'Chai Ka Chanda',
  appDescription: 'A desi Web3 tip jar powered by USDC on Arc Testnet',
  appUrl: 'https://chaikachanda.netlify.app',
  appIcon: 'https://chaikachanda.netlify.app/favicon.ico',
  projectId: PROJECT_ID,
  chains: [arcTestnetChain, mainnet],
  transports: {
    // Failover: try primary RPC first, fall back to secondary
    [ARC_CHAIN_ID]: fallback([http(ARC_RPC_PRIMARY), http(ARC_RPC_SECONDARY)]),
    [mainnet.id]: http(),
  },
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        injectedWallet,      // prioritised first — catches MetaMask Mobile, Trust, OKX in-app browsers
        metaMaskWallet,
        braveWallet,
        rabbyWallet,
        coinbaseWallet,
        rainbowWallet,
        okxWallet,
        bitgetWallet,
        trustWallet,
        walletConnectWallet,
      ],
    },
  ],
  storage: createStorage({ storage: safeStorage }),
  ssr: false,
})
