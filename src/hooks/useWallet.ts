/**
 * useWallet — zero-dependency, pure-EIP-1193 wallet hook.
 *
 * Discovery (1 second window):
 *   1. Listen for eip6963:announceProvider events.
 *   2. Dispatch eip6963:requestProvider to trigger announcements.
 *   3. Also collect window.ethereum and window.ethereum.providers[].
 *   4. De-duplicate by rdns / uuid.
 *   After 1 s: if exactly 1 wallet found → connect automatically.
 *              if 2+ found           → show picker.
 *              if none found         → show deep-link buttons.
 *
 * Per-request timeout: 30 s.  Each waiting step surfaces a text label so the
 * UI can show exactly what is happening.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { requireChain, getUsdc } from '@/onchain-facts'

// ── Arc Testnet chain params ───────────────────────────────────────────────────

const ARC_CHAIN_ID = 5042002
const arcChain = requireChain(ARC_CHAIN_ID)
const arcUsdc = getUsdc(ARC_CHAIN_ID)

const ARC_CHAIN_ID_HEX = `0x${ARC_CHAIN_ID.toString(16)}`

const ARC_CHAIN_PARAMS = {
  chainId: ARC_CHAIN_ID_HEX,
  chainName: arcChain.name,
  nativeCurrency: {
    name: arcChain.nativeCurrency.symbol,
    symbol: arcChain.nativeCurrency.symbol,
    decimals: arcChain.nativeCurrency.decimals,
  },
  rpcUrls: arcChain.rpcUrls,
  blockExplorerUrls: [arcChain.explorerBase],
  ...(arcUsdc ? {} : {}),
}

// ── EIP-1193 ──────────────────────────────────────────────────────────────────

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  on(event: string, handler: (...args: unknown[]) => void): void
  removeListener(event: string, handler: (...args: unknown[]) => void): void
}

// ── EIP-6963 ──────────────────────────────────────────────────────────────────

export interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface EIP6963AnnounceEvent extends Event {
  detail: { info: EIP6963ProviderInfo; provider: EIP1193Provider }
}

export interface DetectedWallet {
  info: EIP6963ProviderInfo
  provider: EIP1193Provider
}

// ── Error kinds ───────────────────────────────────────────────────────────────

export type WalletErrorKind =
  | 'no_wallet'
  | 'rejected'
  | 'wrong_network'
  | 'add_network_failed'
  | 'timeout'
  | 'connection_failed'

export interface WalletError {
  kind: WalletErrorKind
  message: string
}

// ── Discovery phase ───────────────────────────────────────────────────────────

export type DiscoveryPhase =
  | 'idle'
  | 'discovering'   // 1-second EIP-6963 window
  | 'ready'         // window closed; wallets list is final
  | 'connecting'    // eth_requestAccounts in flight
  | 'switching'     // wallet_switchEthereumChain in flight
  | 'connected'

// ── Step text (shown in UI while waiting) ─────────────────────────────────────

export type WalletStep =
  | 'idle'
  | 'looking'          // discovering
  | 'approve_connect'  // waiting for eth_requestAccounts
  | 'switching'        // waiting for switchEthereumChain
  | 'adding_network'   // waiting for addEthereumChain
  | 'done'

// ── Hook state ────────────────────────────────────────────────────────────────

export interface WalletState {
  phase: DiscoveryPhase
  walletStep: WalletStep
  detectedWallets: DetectedWallet[]
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  error: WalletError | null
  /** The active EIP-1193 provider (set after connect). */
  provider: EIP1193Provider | null
  startDiscovery: () => void
  connectTo: (wallet: DetectedWallet) => Promise<void>
  addArcNetwork: () => Promise<void>
  disconnect: () => void
}

// ── Timeout wrapper (30 s) ────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('timeout'), { code: -32099 })), ms),
    ),
  ])
}

// ── switchToArc (exported for direct use) ────────────────────────────────────

export async function switchToArc(provider: EIP1193Provider): Promise<void> {
  try {
    await withTimeout(provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID_HEX }],
    }))
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code
    if (code === 4902 || code === -32603) {
      await withTimeout(provider.request({
        method: 'wallet_addEthereumChain',
        params: [ARC_CHAIN_PARAMS],
      }))
      await withTimeout(provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      }))
    } else {
      throw err
    }
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWallet(): WalletState {
  const [phase, setPhase] = useState<DiscoveryPhase>('idle')
  const [walletStep, setWalletStep] = useState<WalletStep>('idle')
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([])
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [activeProvider, setActiveProvider] = useState<EIP1193Provider | null>(null)
  const [error, setError] = useState<WalletError | null>(null)

  const providerRef = useRef<EIP1193Provider | null>(null)
  const seenKeys = useRef<Set<string>>(new Set())

  // ── listeners ─────────────────────────────────────────────────────────────

  const handleAccountsChanged = useCallback((accounts: unknown) => {
    const accs = accounts as string[]
    if (!accs?.length) { setAddress(null); setChainId(null) }
    else setAddress(accs[0])
  }, [])

  const handleChainChanged = useCallback((id: unknown) => {
    setChainId(parseInt(id as string, 16))
  }, [])

  const attach = useCallback((p: EIP1193Provider) => {
    p.on('accountsChanged', handleAccountsChanged)
    p.on('chainChanged', handleChainChanged)
  }, [handleAccountsChanged, handleChainChanged])

  const detach = useCallback((p: EIP1193Provider) => {
    p.removeListener('accountsChanged', handleAccountsChanged)
    p.removeListener('chainChanged', handleChainChanged)
  }, [handleAccountsChanged, handleChainChanged])

  useEffect(() => () => { if (providerRef.current) detach(providerRef.current) }, [detach])

  // ── collect a provider (de-duplicate) ────────────────────────────────────

  const collect = useCallback((info: EIP6963ProviderInfo, provider: EIP1193Provider) => {
    const key = info.rdns || info.uuid
    if (seenKeys.current.has(key)) return
    seenKeys.current.add(key)
    setDetectedWallets(prev => [...prev, { info, provider }])
  }, [])

  // ── discovery ─────────────────────────────────────────────────────────────

  const startDiscovery = useCallback(() => {
    if (typeof window === 'undefined') return
    setError(null)
    setDetectedWallets([])
    seenKeys.current = new Set()
    setPhase('discovering')
    setWalletStep('looking')

    // EIP-6963 listener
    const onAnnounce = (e: Event) => {
      const { info, provider } = (e as EIP6963AnnounceEvent).detail ?? {}
      if (info?.uuid && provider) collect(info, provider)
    }
    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    // Also include window.ethereum and window.ethereum.providers[]
    const win = window as unknown as {
      ethereum?: EIP1193Provider & { providers?: EIP1193Provider[]; _metamask?: unknown; isBraveWallet?: boolean; isCoinbaseWallet?: boolean; isMetaMask?: boolean }
    }

    if (win.ethereum) {
      // Multi-provider array (Coinbase injects this)
      const providers = win.ethereum.providers ?? [win.ethereum]
      providers.forEach((p) => {
        const pe = p as typeof win.ethereum
        const name = pe?.isBraveWallet ? 'Brave Wallet'
          : pe?.isCoinbaseWallet ? 'Coinbase Wallet'
          : pe?.isMetaMask ? 'MetaMask'
          : 'Browser Wallet'
        const rdns = pe?.isBraveWallet ? 'com.brave.wallet'
          : pe?.isCoinbaseWallet ? 'com.coinbase.wallet'
          : pe?.isMetaMask ? 'io.metamask'
          : 'window.ethereum'
        collect(
          { uuid: rdns, name, icon: '', rdns },
          p,
        )
      })
    }

    const timer = setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
      setDetectedWallets(prev => {
        // schedule auto-connect outside setState
        if (prev.length === 1) {
          // will be triggered by useEffect watching detectedWallets + phase
          setTimeout(() => setPhase('ready'), 0)
        } else {
          setPhase('ready')
        }
        return prev
      })
    }, 1000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
    }
  }, [collect])

  // Auto-connect when exactly one wallet found and phase → ready
  const autoConnectDoneRef = useRef(false)
  useEffect(() => {
    if (phase === 'ready' && detectedWallets.length === 1 && !autoConnectDoneRef.current) {
      autoConnectDoneRef.current = true
      void connectTo(detectedWallets[0])
    }
    if (phase === 'discovering') autoConnectDoneRef.current = false
  // connectTo is stable; detectedWallets included to re-check after discovery
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, detectedWallets.length])

  // ── connect ───────────────────────────────────────────────────────────────

  const connectTo = useCallback(async (wallet: DetectedWallet) => {
    setError(null)
    setPhase('connecting')
    setWalletStep('approve_connect')

    let accounts: string[]
    try {
      accounts = (await withTimeout(
        wallet.provider.request({ method: 'eth_requestAccounts' }) as Promise<string[]>,
      ))
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code
      const kind: WalletErrorKind = code === 4001 ? 'rejected' : code === -32099 ? 'timeout' : 'connection_failed'
      setError({ kind, message: String(err) })
      setPhase('ready')
      setWalletStep('idle')
      return
    }

    if (!accounts?.length) {
      setError({ kind: 'connection_failed', message: 'no_accounts' })
      setPhase('ready')
      setWalletStep('idle')
      return
    }

    setPhase('switching')
    setWalletStep('switching')
    try {
      await switchToArc(wallet.provider)
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code
      const kind: WalletErrorKind = code === 4001 ? 'rejected' : 'add_network_failed'
      setError({ kind, message: String(err) })
      setPhase('ready')
      setWalletStep('idle')
      return
    }

    let currentChainId = ARC_CHAIN_ID
    try {
      const raw = (await wallet.provider.request({ method: 'eth_chainId' })) as string
      currentChainId = parseInt(raw, 16)
    } catch { /* use default */ }

    if (providerRef.current) detach(providerRef.current)
    providerRef.current = wallet.provider
    attach(wallet.provider)

    setActiveProvider(wallet.provider)
    setAddress(accounts[0])
    setChainId(currentChainId)
    setPhase('connected')
    setWalletStep('done')
  }, [attach, detach])

  // ── addArcNetwork ─────────────────────────────────────────────────────────

  const addArcNetwork = useCallback(async () => {
    const p = providerRef.current
    if (!p) return
    try {
      await withTimeout(p.request({ method: 'wallet_addEthereumChain', params: [ARC_CHAIN_PARAMS] }))
    } catch { /* user dismissed */ }
  }, [])

  // ── disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (providerRef.current) detach(providerRef.current)
    providerRef.current = null
    setAddress(null)
    setChainId(null)
    setError(null)
    setActiveProvider(null)
    setPhase('idle')
    setWalletStep('idle')
  }, [detach])

  return {
    phase,
    walletStep,
    detectedWallets,
    address,
    chainId,
    isConnected: !!address,
    isConnecting: phase === 'connecting' || phase === 'switching',
    error,
    provider: activeProvider,
    startDiscovery,
    connectTo,
    addArcNetwork,
    disconnect,
  }
}
