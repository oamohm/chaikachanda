import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_RPC = 'https://rpc.testnet.arc.io';

export const arcTestnet = {
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { 
    name: 'USDC', 
    symbol: 'USDC', 
    decimals: 18 
  },
  rpcUrls: {
    default: { http: [ARC_RPC] },
    public: { http: [ARC_RPC] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://explorer.testnet.arc.io' },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: 'Chai Ka Chanda',
  projectId: 'a02844ca8436b1d4c2062f6bfa0f77bc',
  chains: [arcTestnet],
  ssr: false,
});
