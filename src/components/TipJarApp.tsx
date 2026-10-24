import { Component, useState, useEffect, useRef, useCallback } from 'react'
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useWalletClient,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { type Abi, formatEther, parseUnits, createPublicClient, http } from 'viem'
import { toast } from 'sonner'
import {
  Coffee,
  Heart,
  ArrowDownToLine,
  Users,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  QrCode,
  Droplets,
  Store,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  ShoppingCart,
  Bike,
  UtensilsCrossed,
  Receipt,
  Sparkles,
  Music,
  ShieldCheck,
  Key,
  Flame,
  Award,
  Calendar,
  Gift,
} from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount } from '@/onchain-money'
import { type Lang, strings, loadLang, saveLang } from '@/i18n'
import { purgeWagmiCache } from '@/safe-storage'
import { useSpeech } from '@/hooks/useSpeech'
import QrScanner, { qrScanSupported } from './QrScanner'
import tipJarArtifact from '../../contracts/out/TipJar.sol/TipJar.json'

// ── Constants ──────────────────────────────────────────────────────────────────
const ARC_TESTNET_CHAIN_ID = 5042002
const TIPJAR = {
  address: '0xd385945e5b5cdf022b99e4468a37ec045cd24197' as `0x${string}`,
  abi: tipJarArtifact.abi,
}
const arcChain = requireChain(ARC_TESTNET_CHAIN_ID)
const ARC_RPC = 'https://rpc.testnet.arc.network'
const arcViemChain = {
  id: ARC_TESTNET_CHAIN_ID,
  name: arcChain.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: arcChain.nativeCurrency.decimals },
  rpcUrls: { default: { http: [ARC_RPC] } },
} as const
const arcPublicClient = createPublicClient({ chain: arcViemChain, transport: http(ARC_RPC) })

const NATIVE_DECIMALS = 18
const ERC20_DECIMALS = 6
const SCALE = BigInt(1e12)
const MINIMUM_DISPLAY = 0.1
const FAUCET_URL = 'https://faucet.circle.com'
const LOW_BALANCE_THRESHOLD = 2

function toNative(erc20Amount: bigint): bigint { return erc20Amount * SCALE }
function parseErc20(amount: string): bigint {
  try { return parseUnits(amount, ERC20_DECIMALS) } catch { return 0n }
}
function formatNativeUsdc(raw: bigint): string {
  return Amount.fromRaw(raw, NATIVE_DECIMALS).toFixed(2)
}

// ── Menu Configuration ────────────────────────────────────────────────────────
interface MenuItem {
  key: 'chai' | 'kulhadChai' | 'masalaChai' | 'samosa' | 'kachori' | 'lassi' | 'aloo' | 'combo' | 'kulhad'
  emoji: string
  price: string
  amount: string
  badge?: 'bestseller' | 'hot' | 'organic' | 'offer' | 'new'
  splitTag?: true
  color: string
  selectedBg: string
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'chai',       emoji: '🍵',   price: '0.25 USDC', amount: '0.25', badge: 'bestseller', color: '#f59e0b', selectedBg: 'rgba(245,158,11,0.15)' },
  { key: 'kulhadChai', emoji: '🏺',   price: '0.50 USDC', amount: '0.5',  badge: 'hot',        color: '#ef4444', selectedBg: 'rgba(239,68,68,0.13)'   },
  { key: 'masalaChai', emoji: '🫖',   price: '0.75 USDC', amount: '0.75', badge: 'organic',    color: '#10b981', selectedBg: 'rgba(16,185,129,0.13)'  },
  { key: 'samosa',     emoji: '🥟',   price: '0.50 USDC', amount: '0.5',  badge: 'hot',        color: '#f97316', selectedBg: 'rgba(249,115,22,0.13)'  },
  { key: 'kachori',    emoji: '🫓',   price: '0.60 USDC', amount: '0.6',  badge: 'new',        color: '#8b5cf6', selectedBg: 'rgba(139,92,246,0.13)'  },
  { key: 'lassi',      emoji: '🥛',   price: '0.80 USDC', amount: '0.8',  badge: 'organic',    color: '#14b8a6', selectedBg: 'rgba(20,184,166,0.13)'  },
  { key: 'aloo',       emoji: '🫔',   price: '1.25 USDC', amount: '1.25', badge: 'offer',      color: '#ec4899', selectedBg: 'rgba(236,72,153,0.13)'  },
  { key: 'combo',      emoji: '🍵🥟', price: '1.00 USDC', amount: '1',    badge: 'offer', splitTag: true, color: '#6366f1', selectedBg: 'rgba(99,102,241,0.15)' },
  { key: 'kulhad',     emoji: '🏺✨', price: '2.50 USDC', amount: '2.5',  color: '#d97706', selectedBg: 'rgba(217,119,6,0.15)' },
]

const BADGE_STYLES: Record<NonNullable<MenuItem['badge']>, { bg: string; color: string; label: { hi: string; en: string } }> = {
  bestseller: { bg: 'rgba(251,191,36,0.18)', color: '#b45309', label: { hi: 'बेस्टसेलर', en: 'Bestseller' } },
  hot:        { bg: 'rgba(239,68,68,0.14)',  color: '#dc2626', label: { hi: 'गरमागरम',   en: 'Hot'        } },
  organic:    { bg: 'rgba(34,197,94,0.14)',  color: '#16a34a', label: { hi: 'ऑर्गेनिक',  en: 'Organic'    } },
  offer:      { bg: 'rgba(99,102,241,0.14)', color: '#6366f1', label: { hi: 'ऑफर',       en: 'Offer'      } },
  new:        { bg: 'rgba(168,85,247,0.14)', color: '#9333ea', label: { hi: 'नया',        en: 'New'        } },
}

function getMenuLabel(key: MenuItem['key'], s: typeof strings['en']): string {
  if (key === 'chai')       return s.menuItemChai
  if (key === 'kulhadChai') return s.menuItemKulhadChai
  if (key === 'masalaChai') return s.menuItemMasalaChai
  if (key === 'samosa')     return s.menuItemSamosa
  if (key === 'kachori')    return s.menuItemKachori
  if (key === 'lassi')      return s.menuItemLassi
  if (key === 'aloo')       return s.menuItemAloo
  if (key === 'combo')      return s.menuItemCombo
  return s.menuItemKulhad
}

type CartMap = Partial<Record<MenuItem['key'], number>>

function cartTotal(cart: CartMap): string {
  let sum = 0
  for (const item of MENU_ITEMS) {
    const qty = cart[item.key] ?? 0
    if (qty > 0) sum += qty * parseFloat(item.amount)
  }
  return sum.toFixed(2)
}

function cartSummaryLine(cart: CartMap, s: typeof strings['en']): string {
  return MENU_ITEMS
    .filter((i) => (cart[i.key] ?? 0) > 0)
    .map((i) => `${getMenuLabel(i.key, s)} ×${cart[i.key] ?? 0}`)
    .join(', ')
}

// ── Merchant Directory ─────────────────────────────────────────────────────────
interface Merchant {
  name: string; handle: string; emoji: string
  address: `0x${string}`; defaultAmount: string
}
const MERCHANTS: Merchant[] = [
  { name: 'Ramesh Chaiwala',   handle: '@ramesh_chai',   emoji: '☕', address: '0x1234567890123456789012345678901234567890', defaultAmount: '0.5' },
  { name: 'Sunita Samosawali', handle: '@sunita_samosa', emoji: '🥟', address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', defaultAmount: '1'   },
  { name: 'Arun Kulhadwala',   handle: '@arun_kulhad',   emoji: '🏺', address: '0x9876543210987654321098765432109876543210', defaultAmount: '2.5' },
  { name: 'Priya Chai Corner', handle: '@priya_corner',  emoji: '🍵', address: '0xDeAdBeEf1234567890DeAdBeEf1234567890DeAd', defaultAmount: '1.5' },
]

// ── Types ──────────────────────────────────────────────────────────────────────
type TipStep = 'idle' | 'summary' | 'tipping' | 'pending-tip' | 'timed-out' | 'done'
type Fulfillment = 'delivery' | 'dine-in'
type ActiveTab = 'order' | 'hub' | 'vault' | 'perks'

interface MyOrder {
  txHash: `0x${string}`
  amount: string
  message: string
  fulfillment: Fulfillment
  cartLine: string
  timestamp: number
}

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function parseOnchainError(error: unknown, lang: Lang): string {
  const s = strings[lang]
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  const code = (error as { code?: number })?.code
  if (code === 4001 || msg.includes('user rejected') || msg.includes('denied') || msg.includes('rejected')) return s.errRejected
  if (msg.includes('insufficient') || msg.includes('exceeds balance') || msg.includes('insufficient funds')) return s.errInsufficientFunds
  return s.errDefault
}

const glass = {
  card: {
    background: '#fffaf3',
    border: '1.5px solid rgba(245,158,11,0.40)',
    boxShadow: '0 6px 32px rgba(44,24,16,0.18), 0 1.5px 0 rgba(251,191,36,0.12)',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(255,245,225,0.7)',
    border: '1px solid rgba(245,158,11,0.22)',
  } as React.CSSProperties,
}
const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

function UsdcIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="inline-block align-middle flex-shrink-0" style={{ marginBottom: 2 }}>
      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
      <path d="M20.022 18.124c0-2.124-1.276-2.852-3.829-3.144-1.827-.232-2.189-.696-2.189-1.508 0-.812.58-1.392 1.914-1.392 1.16 0 1.742.406 2.03 1.392a.28.28 0 0 0 .27.196h1.218c.174 0 .29-.116.29-.29v-.058a3.137 3.137 0 0 0-2.812-2.608v-1.334c0-.174-.116-.29-.29-.29H15.36c-.174 0-.29.116-.29.29v1.276c-1.682.232-2.754 1.334-2.754 2.754 0 2.03 1.218 2.812 3.77 3.086 1.682.29 2.247.638 2.247 1.566 0 .928-.812 1.566-1.914 1.566-1.508 0-2.03-.638-2.202-1.508a.28.28 0 0 0-.27-.232h-1.276c-.174 0-.29.116-.29.29v.058c.232 1.798 1.334 2.986 3.27 3.276v1.276c0 .174.116.29.29.29h1.218c.174 0 .29-.116.29-.29v-1.276c1.74-.29 2.812-1.392 2.812-2.87z" fill="white"/>
      <path d="M13.145 22.48c-3.77-1.334-5.8-5.394-4.408-9.106a7.017 7.017 0 0 1 4.408-4.408.286.286 0 0 0 .174-.29v-.116c0-.174-.116-.29-.29-.29-.058 0-.116 0-.174.058-4.582 1.45-7.018 6.264-5.568 10.788 1.102 3.48 4.002 5.916 7.482 6.264a.286.286 0 0 0 .29-.29v-.116a.286.286 0 0 0-.174-.29c-.522-.116-1.044-.29-1.74-.522zM18.828 8.734c-.058-.058-.174-.058-.232-.058-.174 0-.29.116-.29.29v.116c0 .116.058.232.174.29a7.017 7.017 0 0 1 4.408 4.408c.986 3.77-.928 7.714-4.408 9.106-.522.174-.986.29-1.508.406-.116.058-.174.174-.174.29v.116c0 .174.116.29.29.29.058 0 .116 0 .232-.058 4.466-1.508 6.902-6.322 5.394-10.788a8.72 8.72 0 0 0-3.886-4.408z" fill="white"/>
    </svg>
  )
}

// ── Retro Radio ────────────────────────────────────────────────────────────────
const LOFI_TRACKS = [
  { title: 'Arc Lo-Fi Chill', artist: 'Chill Vibes', src: 'https://cdn.pixabay.com/audio/2022/10/31/audio_b5a1d5f9d5.mp3' },
  { title: 'Circle USDC Beats', artist: 'Ambient India', src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3' },
  { title: 'Ambient Stall Vibes', artist: 'Lo-Fi India', src: 'https://cdn.pixabay.com/audio/2021/11/25/audio_5358a6a049.mp3' },
]

function FmRadioWidget({ lang }: { lang: Lang }) {
  const [playing, setPlaying] = useState(false)
  const [trackIdx, setTrackIdx] = useState(0)
  const [beat, setBeat] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (playing) el.play().catch(() => setPlaying(false))
    else el.pause()
  }, [playing])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setBeat((b) => (b + 1) % 4), 400)
    return () => clearInterval(t)
  }, [playing])

  return (
    <div className="rounded-2xl p-4" style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)', border:'2px solid rgba(99,102,241,0.35)', boxShadow:'0 4px 20px rgba(99,102,241,0.2)' }}>
      <audio ref={audioRef} src={LOFI_TRACKS[trackIdx].src} preload="none" loop />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(99,102,241,0.3)' }}>
          <Music size={16} className="text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black" style={{ color:'#c7d2fe' }}>{lang === 'hi' ? 'देसी FM 92.7' : 'Desi FM 92.7'}</p>
          <p className="text-[10px]" style={{ color:'rgba(199,210,254,0.6)' }}>{lang === 'hi' ? 'लो-फाई चाय बीट्स' : 'Lo-Fi Chai Beats'}</p>
        </div>
        <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
          {[3,5,4,2,5,3,4].map((h, i) => (
            <div key={i} className="w-1 rounded-full transition-all duration-200"
              style={{ height: playing && beat > 0 ? `${(h + (beat + i) % 3) * 3}px` : '4px', background: playing ? '#818cf8' : 'rgba(129,140,248,0.3)' }} />
          ))}
        </div>
      </div>
      <div className="rounded-lg px-2 py-1.5 mb-2 overflow-hidden" style={{ background:'rgba(0,0,0,0.3)' }}>
        <p className="text-xs font-semibold truncate" style={{ color:'#e0e7ff' }}>{LOFI_TRACKS[trackIdx].title}</p>
      </div>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setPlaying((p) => !p)}
          className="flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ background: playing ? 'rgba(99,102,241,0.25)' : '#6366f1', color:'#e0e7ff' }}>
          <span>{playing ? '⏸' : '▶'}</span>
          {playing ? (lang === 'hi' ? 'रोकें' : 'Pause') : (lang === 'hi' ? 'चलाएं' : 'Play')}
        </button>
        <button onClick={() => setMuted((m) => !m)}
          className="w-9 rounded-lg flex items-center justify-center text-sm"
          style={{ background:'rgba(99,102,241,0.2)', color: muted ? '#f87171' : '#a5b4fc' }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  )
}

// ── Error Boundary ─────────────────────────────────────────────────────────────
interface BoundaryState { hasError: boolean }
class ErrorBoundary extends Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(): BoundaryState { return { hasError: true } }
  override componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[TipJar]', error, info) }
  override render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: '#1c1512' }}>
        <div className="rounded-2xl p-8 text-center max-w-xs w-full bg-amber-50 text-stone-900 border-2 border-orange-500">
          <AlertCircle size={36} className="mx-auto mb-3 text-red-500" />
          <p className="font-bold mb-1">An error occurred</p>
          <button onClick={() => window.location.reload()} className="w-full rounded-xl py-2.5 text-sm font-bold bg-orange-600 text-white mt-4">Reload App</button>
        </div>
      </div>
    )
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────
function TipJarInner() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChain } = useSwitchChain()

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address ?? undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address && isConnected, staleTime: 0, refetchInterval: 3000 },
  })

  const [lang, setLangState] = useState<Lang>(loadLang)
  const s = strings[lang]
  const { muted, toggleMute } = useSpeech(lang)

  // Layout Tab State for Desktop Spread
  const [activeTab, setActiveTab] = useState<ActiveTab>('order')

  const [cart, setCart] = useState<CartMap>({})
  const [fulfillment, setFulfillment] = useState<Fulfillment>('dine-in')
  const totalStr = cartTotal(cart)
  const hasItems = parseFloat(totalStr) > 0

  const [name, setName] = useState('')
  const [walletAddr, setWalletAddr] = useState('')
  const [message, setMessage] = useState('')
  const [vibeTag, setVibeTag] = useState<string | null>(null)

  const [step, setStep] = useState<TipStep>('idle')
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [userBalanceDisplay, setUserBalanceDisplay] = useState<string | null>(null)
  const [showMerchants, setShowMerchants] = useState(true)
  const [freeChaiPool, setFreeChaiPool] = useState(1)

  const [totalCollected, setTotalCollected] = useState<bigint | null>(null)
  const [tipsCount, setTipsCount] = useState<bigint | null>(null)

  const isWrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID
  const isBusy = step === 'tipping' || step === 'pending-tip'

  const { data: receiptData, status: receiptStatus } = useWaitForTransactionReceipt({
    hash: pendingHash ?? undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!pendingHash && step === 'pending-tip' },
  })

  useEffect(() => {
    if (step !== 'pending-tip' || !pendingHash) return
    if (receiptStatus === 'success' && receiptData) {
      setStep('done')
      void refetchBalance()
      toast.success(s.thankYouSpoken)
    }
  }, [receiptStatus, receiptData, s, step, pendingHash, refetchBalance])

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      try {
        const [tot, cnt] = await Promise.all([
          arcPublicClient.readContract({ address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'totalCollected' }) as Promise<bigint>,
          arcPublicClient.readContract({ address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'getTipsCount' }) as Promise<bigint>,
        ])
        if (!cancelled) { setTotalCollected(tot); setTipsCount(cnt) }
      } catch {}
    }
    void read()
    const timer = setInterval(read, 3000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!isConnected || !balanceData) { setUserBalanceDisplay(null); return }
    setUserBalanceDisplay(parseFloat(formatEther(balanceData.value)).toFixed(2))
  }, [isConnected, balanceData])

  const adjustCart = (key: MenuItem['key'], delta: number) => {
    setCart((prev) => {
      const cur = prev[key] ?? 0
      const next = Math.max(0, cur + delta)
      const updated = { ...prev, [key]: next }
      if (next === 0) delete updated[key]
      return updated
    })
  }

  const handleSendTip = async () => {
    if (!walletClient || !address) { toast.error('Please connect wallet'); return }
    if (isWrongChain) { void switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }

    const erc20Units = parseErc20(totalStr)
    const nativeValue = toNative(erc20Units)
    const senderName = name.trim() || formatAddress(address)
    const finalMsg = message.trim() || `Order: ${cartSummaryLine(cart, s)}`

    setStep('tipping')
    setPendingHash(null)
    try {
      const txHash = await walletClient.writeContract({
        address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'tip',
        args: [senderName, finalMsg.slice(0, 80)], value: nativeValue,
      })
      setPendingHash(txHash)
      setStep('pending-tip')
    } catch (e) {
      setStep('idle')
      toast.error(parseOnchainError(e, lang))
    }
  }

  const formattedTotal = totalCollected != null ? formatNativeUsdc(totalCollected) : '0.00'

  return (
    <>
      {showQr && <QrScanner onResult={(val) => { setWalletAddr(val); setShowQr(false) }} onClose={() => setShowQr(false)} cancelLabel="Cancel" />}

      <div className="min-h-dvh text-amber-50 pb-20" style={{ background: '#1c1512' }}>
        
        {/* ── Desktop & Mobile Top Header Bar ── */}
        <header className="sticky top-0 z-40 bg-stone-950/90 border-b border-amber-500/30 px-4 py-3 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">☕</span>
              <div>
                <p className="font-black text-base text-amber-100 leading-none">चाय का चंदा</p>
                <p className="text-[10px] text-amber-300/80 font-semibold">Chai Ka Chanda • Platform No. 1</p>
              </div>
            </div>

            {/* Desktop Center Navigation Menu Bar */}
            <div className="hidden md:flex items-center gap-1 bg-stone-900/80 p-1.5 rounded-2xl border border-amber-500/20">
              <button onClick={() => setActiveTab('order')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'order' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>
                <ShoppingCart size={14} /> Menu & Order
              </button>
              <button onClick={() => setActiveTab('hub')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'hub' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>
                <Music size={14} /> Village Hub & Radio
              </button>
              <button onClick={() => setActiveTab('vault')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'vault' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>
                <Store size={14} /> Treasury & Vendors
              </button>
              <button onClick={() => setActiveTab('perks')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'perks' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>
                <Award size={14} /> Passes & Perks
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-xl overflow-hidden text-xs font-bold border border-amber-500/30">
                {(['hi','en'] as Lang[]).map((l) => (
                  <button key={l} onClick={() => setLangState(l)} className="px-3 py-1.5" style={lang === l ? { background:'#d97706',color:'#fff' } : { background:'transparent',color:'#a3a3a3' }}>
                    {l === 'hi' ? 'हिन्दी' : 'EN'}
                  </button>
                ))}
              </div>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>
          </div>
        </header>

        {/* ── Main Full-Screen Desktop Dashboard Container ── */}
        <main className="max-w-7xl mx-auto px-4 py-6">

          {/* Top Hero Banner */}
          <div className="mb-6 rounded-3xl p-6 relative overflow-hidden text-center" style={{ background: 'linear-gradient(135deg, #7c2d12, #b45309, #431407)', border: '2px solid rgba(251,191,36,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-2xl md:text-3xl font-black text-amber-100 mb-1">🚂 Platform No. 1 Smart Chai Stall</p>
                <p className="text-xs text-amber-200 font-medium">Authentic Indian Railway Vibes • Web3 USDC Settled</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-100 text-xs font-bold border border-emerald-500/30">Arc Testnet ●</span>
                <span className="px-3 py-1 rounded-full bg-amber-900/80 text-amber-100 text-xs font-bold border border-amber-500/30">Total: {formattedTotal} USDC</span>
                <span className="px-3 py-1 rounded-full bg-indigo-900/80 text-indigo-100 text-xs font-bold border border-indigo-500/30">Free Chais Pool: {freeChaiPool}</span>
              </div>
            </div>
          </div>

          {/* ── DESKTOP GRID / TAB VIEW DISPLAY ── */}

          {/* SECTION 1: MENU & ORDER (Visible on Desktop always or via Tab) */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'order' ? 'hidden md:grid' : 'grid'}`}>
            
            {/* Left Col: Menu */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-3xl bg-amber-50/95 text-stone-900 border-2 border-orange-500">
                <p className="font-black text-base text-stone-900 border-b border-orange-200 pb-2 mb-3">PLATFORM MENU — PRICE LIST</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MENU_ITEMS.map((item) => {
                    const qty = cart[item.key] ?? 0
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-orange-100/60 border border-orange-200">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{item.emoji}</span>
                          <div>
                            <p className="text-sm font-bold text-stone-900">{getMenuLabel(item.key, s)}</p>
                            <p className="text-xs font-black text-orange-700">{item.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-orange-300">
                          <button onClick={() => adjustCart(item.key, -1)} disabled={qty === 0} className="w-6 h-6 rounded bg-orange-100 text-orange-800 font-black disabled:opacity-30">-</button>
                          <span className="w-4 text-center text-xs font-bold">{qty}</span>
                          <button onClick={() => adjustCart(item.key, 1)} className="w-6 h-6 rounded bg-orange-600 text-white font-black">+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Form Details */}
              <div className="p-5 rounded-3xl bg-amber-50/95 text-stone-900 border-2 border-orange-500 space-y-3">
                <p className="font-black text-sm text-stone-800">Sender Details & Custom Note</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name (Optional)" className="p-3 rounded-xl bg-white border border-orange-300 text-xs text-stone-900 outline-none" />
                  <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message / Special Request" className="p-3 rounded-xl bg-white border border-orange-300 text-xs text-stone-900 outline-none" />
                </div>
              </div>
            </div>

            {/* Right Col: Bus-Ticket Style Cart */}
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-amber-50/95 text-stone-900 border-2 border-orange-500">
                <p className="font-black text-base text-stone-900 mb-2 flex items-center gap-2"><Receipt size={18} /> ORDER SUMMARY TICKET</p>
                <p className="text-xs text-stone-600 mb-4">Indian Railways • Chai Ka Chanda Stall</p>
                
                {hasItems ? (
                  <div className="space-y-2 mb-4 border-t border-b border-orange-200 py-3">
                    {MENU_ITEMS.filter((i) => (cart[i.key] ?? 0) > 0).map((item) => (
                      <div key={item.key} className="flex justify-between text-xs font-bold text-stone-800">
                        <span>{getMenuLabel(item.key, s)} × {cart[item.key]}</span>
                        <span>{( (cart[item.key] ?? 0) * parseFloat(item.amount) ).toFixed(2)} USDC</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic mb-4">No items added to cart yet.</p>
                )}

                <div className="p-3 rounded-xl bg-orange-600 text-white font-black text-sm flex justify-between items-center mb-4">
                  <span>Total Payable:</span>
                  <span>{totalStr} USDC</span>
                </div>

                <button onClick={() => void handleSendTip()} disabled={isBusy || !hasItems} className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2">
                  <Sparkles size={18} /> {isBusy ? 'Processing...' : `Pay ${totalStr} USDC`}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: VILLAGE HUB & RADIO */}
          <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${activeTab !== 'hub' ? 'hidden md:grid' : 'grid'}`}>
            <FmRadioWidget lang={lang} />
            <div className="p-5 rounded-3xl bg-stone-900 border-2 border-amber-500/40 text-amber-100">
              <p className="font-black text-base text-amber-400 mb-2">🍃 Chai Philosophy & Station Vibes</p>
              <p className="text-xs italic text-amber-200/80 mb-4">"Chai is not just a drink, it is a warm emotion on Platform No. 1"</p>
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/30 text-xs space-y-2">
                <p>• Brewed fresh with pure cow milk and hand-crushed cardamom.</p>
                <p>• Web3 USDC settlement directly to the smart stall treasury.</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: TREASURY & VENDORS */}
          <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${activeTab !== 'vault' ? 'hidden md:grid' : 'grid'}`}>
            <div className="p-5 rounded-3xl bg-stone-900 border-2 border-amber-500/40">
              <p className="font-black text-base text-amber-400 mb-2">🏪 Registered Station Vendors</p>
              <div className="space-y-2">
                {MERCHANTS.map((m) => (
                  <div key={m.address} className="p-3 rounded-xl bg-stone-800 border border-stone-700 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-amber-100">{m.emoji} {m.name}</p>
                      <p className="text-[10px] text-stone-400 font-mono">{formatAddress(m.address)}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-400">{m.defaultAmount} USDC</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-stone-900 border-2 border-amber-500/40">
              <p className="font-black text-base text-amber-400 mb-2">📊 On-Chain Treasury Analytics</p>
              <div className="p-4 rounded-xl bg-stone-800 space-y-2 text-xs">
                <div className="flex justify-between"><span>Vault Value:</span><span className="font-bold text-amber-400">{formattedTotal} USDC</span></div>
                <div className="flex justify-between"><span>Total Orders:</span><span className="font-bold text-amber-400">{tipsCount != null ? Number(tipsCount) : 0}</span></div>
                <div className="flex justify-between"><span>Contract:</span><span className="font-mono text-amber-300">{formatAddress(TIPJAR.address)}</span></div>
              </div>
            </div>
          </div>

        </main>

        {/* ── Mobile Sticky Bottom Navigation Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-stone-950/95 border-t border-amber-500/30 px-4 py-2 flex justify-around backdrop-blur-md">
          <button onClick={() => setActiveTab('order')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'order' ? 'text-orange-500' : 'text-stone-400'}`}>
            <ShoppingCart size={16} />
            <span className="text-[9px] font-bold">Order</span>
          </button>
          <button onClick={() => setActiveTab('hub')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'hub' ? 'text-orange-500' : 'text-stone-400'}`}>
            <Music size={16} />
            <span className="text-[9px] font-bold">Hub</span>
          </button>
          <button onClick={() => setActiveTab('vault')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'vault' ? 'text-orange-500' : 'text-stone-400'}`}>
            <Store size={16} />
            <span className="text-[9px] font-bold">Vault</span>
          </button>
          <button onClick={() => setActiveTab('perks')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'perks' ? 'text-orange-500' : 'text-stone-400'}`}>
            <Award size={16} />
            <span className="text-[9px] font-bold">Perks</span>
          </button>
        </div>

      </div>
    </>
  )
}

export default function TipJarApp() {
  return <ErrorBoundary><TipJarInner /></ErrorBoundary>
}
