import { http, createConfig } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const ARC_TESTNET_CHAIN_ID = 5042002

export const arcTestnet = {
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://explorer.testnet.arc.io' },
  },
} as const

export const wagmiConfig = getDefaultConfig({
  appName: 'Chai Ka Chanda',
  projectId: 'a02844ca8436b1d4c2062f6bfa0f77bc', // वैध प्रोजेक्ट आईडी
  chains: [arcTestnet],
  ssr: false,
})
