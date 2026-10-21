import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TipJarApp from './components/TipJarApp';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://explorer.testnet.arc.io' },
  },
};

const config = getDefaultConfig({
  appName: 'Chai Ka Chanda',
  projectId: 'a02844ca8436b1d4c2062f6bfa0f77bc',
  chains: [arcTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <TipJarApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
