// Arc Studio onchain-facts — Arc Testnet constants
// Single source of truth for chain config.

export interface ChainInfo {
  id: number
  name: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: string[]
  explorerBase: string
}

export interface TokenInfo {
  address: `0x${string}`
  symbol: string
  decimals: number
}

const ARC_TESTNET: ChainInfo = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.testnet.arc.network', 'https://rpc.testnet.arc.io'],
  explorerBase: 'https://explorer.testnet.arc.io',
}

// USDC on Arc Testnet — the ERC-20 precompile address (6 decimals)
const ARC_USDC: TokenInfo = {
  address: '0x3600000000000000000000000000000000000000',
  symbol: 'USDC',
  decimals: 6,
}

const CHAINS: Record<number, ChainInfo> = {
  [ARC_TESTNET.id]: ARC_TESTNET,
}

const USDC: Record<number, TokenInfo> = {
  [ARC_TESTNET.id]: ARC_USDC,
}

export function requireChain(chainId: number): ChainInfo {
  const chain = CHAINS[chainId]
  if (!chain) throw new Error(`Unknown chain ${chainId}`)
  return chain
}

export function getUsdc(chainId: number): TokenInfo | undefined {
  return USDC[chainId]
}

export function buildTxExplorerUrl(chainId: number, txHash: string): string {
  const chain = CHAINS[chainId]
  if (!chain) return '#'
  return `${chain.explorerBase}/tx/${txHash}`
}

export function buildAddressExplorerUrl(chainId: number, address: string): string {
  const chain = CHAINS[chainId]
  if (!chain) return '#'
  return `${chain.explorerBase}/address/${address}`
}
