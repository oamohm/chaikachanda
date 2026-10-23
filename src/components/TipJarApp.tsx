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
const ARC_RPC = 'https://rpc.testnet.arc.io'
const arcViemChain = {
  id: ARC_TESTNET_CHAIN_ID,
  name: arcChain.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
} as const

// RPC Retry & Timeout Fix: Prevents "Network error" popups on slow RPC responses
const arcPublicClient = createPublicClient({
  chain: arcViemChain,
  transport: http(ARC_RPC, {
    retryCount: 5,
    retryDelay: 2000,
    timeout: 10_000,
  }),
})

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

// ── Menu ───────────────────────────────────────────────────────────────────────
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

const VIBE_COLORS = [
  'rgba(245,158,11,0.12)', 'rgba(239,68,68,0.12)',
  'rgba(251,191,36,0.12)', 'rgba(99,102,241,0.12)', 'rgba(168,85,247,0.12)',
]
const VIBE_TEXT_COLORS = ['#d97706','#dc2626','#b45309','#6366f1','#9333ea']

type TipStep = 'idle' | 'summary' | 'tipping' | 'pending-tip' | 'timed-out' | 'done'
type Fulfillment = 'delivery' | 'dine-in'

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
  if (msg.includes('belowminimum')) return s.errBelowMin
  if (msg.includes('nametoolong')) return s.errNameTooLong
  if (msg.includes('messagetoolong')) return s.errMsgTooLong
  if (msg.includes('emptyname')) return s.errEmptyNameContract
  if (msg.includes('emptymessage')) return s.errEmptyMsgContract
  if (msg.includes('transferfailed')) return s.errTransferFailed
  if (msg.includes('reverted')) return s.errReverted
  if (msg.includes('network') || msg.includes('timeout')) return s.errNetwork
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

function MerchantQrModal({ merchant, onClose, closeLabel, title }: {
  merchant: Merchant; onClose: () => void; closeLabel: string; title: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrValue = `ethereum:${merchant.address}?value=${merchant.defaultAmount}`
  useEffect(() => {
    if (!canvasRef.current) return
    import('qrcode').then((QRCode) => {
      if (!canvasRef.current) return
      void QRCode.toCanvas(canvasRef.current, qrValue, { width: 200, margin: 2, color: { dark: '#122D45', light: '#FFFFFF' } })
    }).catch(() => {})
  }, [qrValue])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl p-6 text-center max-w-xs w-full" style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <p className="font-bold text-sm mb-1" style={{ color: '#122D45' }}>{title}</p>
        <p className="text-xs mb-3" style={{ color: '#64748b' }}>{merchant.emoji} {merchant.name}</p>
        <div className="flex justify-center mb-3"><canvas ref={canvasRef} style={{ borderRadius: 8 }} /></div>
        <p className="mono text-xs mb-4 break-all" style={{ color: '#475569' }}>{merchant.address}</p>
        <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: '#122D45', color: '#fff' }}>{closeLabel}</button>
      </div>
    </div>
  )
}

function OrderReceiptCard({ order, lang, onNewOrder }: { order: MyOrder; lang: Lang; onNewOrder: () => void }) {
  const s = strings[lang]
  const [statusIdx, setStatusIdx] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStatusIdx(1), 8_000)
    const t2 = setTimeout(() => setStatusIdx(2), 16_000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const statusLabels = [s.receiptStatus0, s.receiptStatus1, s.receiptStatus2]
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ ...glass.card, border: '1.5px solid rgba(34,197,94,0.3)' }}>
      <div style={{ height: 3, borderRadius: 99, background: spectral, marginBottom: 16 }} />
      <div className="flex items-center gap-2 mb-3">
        <Receipt size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
        <p className="display text-base font-bold" style={{ color: 'var(--ink)' }}>{s.receiptTitle}</p>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ color: 'var(--muted)' }}>{s.receiptOrderId}</span>
          <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, order.txHash)} target="_blank" rel="noopener noreferrer"
            className="mono font-semibold inline-flex items-center gap-1" style={{ color: 'var(--accent-hover)' }}>
            {formatAddress(order.txHash)} <ExternalLink size={10} />
          </a>
        </div>
        {order.cartLine && (
          <div className="flex justify-between text-xs py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ color: 'var(--muted)' }}>{s.receiptItems}</span>
            <span className="font-semibold text-right max-w-[60%]" style={{ color: 'var(--ink)' }}>{order.cartLine}</span>
          </div>
        )}
        <div className="flex justify-between text-xs py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ color: 'var(--muted)' }}>{s.cartTotal}</span>
          <span className="font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{order.amount} USDC</span>
        </div>
        <div className="flex justify-between text-xs py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ color: 'var(--muted)' }}>{s.receiptFulfillment}</span>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {order.fulfillment === 'delivery' ? s.fulfillmentDelivery : s.fulfillmentDineIn}
          </span>
        </div>
      </div>
      <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
        {statusLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={i <= statusIdx ? { background: 'var(--success)', color: '#fff' } : { background: 'rgba(0,0,0,0.07)', color: 'var(--subtle)' }}>
              {i <= statusIdx ? '✓' : i + 1}
            </div>
            <span className="text-xs" style={{ color: i <= statusIdx ? 'var(--ink)' : 'var(--subtle)', fontWeight: i === statusIdx ? 700 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <button onClick={onNewOrder} className="w-full rounded-xl py-3 text-sm font-semibold transition-all" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
        {s.receiptNewOrder}
      </button>
    </div>
  )
}

const CHAI_QUOTES = {
  hi: [
    '"चाय पीओ, दुनिया को समझो।"',
    '"एक कप चाय में ज़िंदगी के सारे जवाब हैं।"',
    '"बातें चाहे छोटी हों, चाय हमेशा बड़ी होती है।"',
    '"दोस्ती और चाय — दोनों गरम रहें।"',
    '"चाय बिना सुबह अधूरी है।"',
  ],
  en: [
    '"Chai is not just a drink, it\'s an emotion."',
    '"A cup of chai a day keeps worries away."',
    '"Life happens, chai helps."',
    '"Chai: the original comfort food."',
    '"Good friends, warm chai — what else do you need?"',
  ],
}
function ChaiPhilosophyCard({ lang }: { lang: Lang }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % CHAI_QUOTES[lang].length), 5_000)
    return () => clearInterval(t)
  }, [lang])
  return (
    <div className="rounded-2xl p-4" style={{ background:'linear-gradient(135deg,#7f1d1d 0%,#9f1239 30%,#b45309 65%,#92400e 100%)', border:'1px solid rgba(251,191,36,0.35)', boxShadow:'0 4px 20px rgba(159,18,57,0.2)' }}>
      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#fde68a' }}>{lang === 'hi' ? '🍃 चाय दर्शन' : '🍃 Chai Philosophy'}</p>
      <p className="text-sm font-semibold italic leading-relaxed" style={{ color:'#fef3c7' }}>{CHAI_QUOTES[lang][idx]}</p>
      <div className="flex gap-1 mt-2">
        {CHAI_QUOTES[lang].map((_, i) => (
          <div key={i} className="h-1 rounded-full transition-all" style={{ width: i === idx ? 20 : 6, background: i === idx ? '#fbbf24' : 'rgba(251,191,36,0.3)' }} />
        ))}
      </div>
    </div>
  )
}

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
    if (playing) { el.play().catch(() => setPlaying(false)) } else { el.pause() }
  }, [playing])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = muted ? 0 : volume
  }, [volume, muted])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const wasPlaying = playing
    el.src = LOFI_TRACKS[trackIdx].src
    el.load()
    if (wasPlaying) el.play().catch(() => setPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setBeat((b) => (b + 1) % 4), 400)
    return () => clearInterval(t)
  }, [playing])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setTrackIdx((i) => (i + 1) % LOFI_TRACKS.length), 20_000)
    return () => clearInterval(t)
  }, [playing])

  const track = LOFI_TRACKS[trackIdx]

  return (
    <div className="rounded-2xl p-4" style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)', border:'2px solid rgba(99,102,241,0.35)', boxShadow:'0 4px 20px rgba(99,102,241,0.2)' }}>
      <audio ref={audioRef} src={LOFI_TRACKS[trackIdx].src} preload="none" loop />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(99,102,241,0.3)' }}>
          <span className="text-lg">📻</span>
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
        <p className="text-xs font-semibold truncate" style={{ color:'#e0e7ff' }}>{track.title}</p>
        <p className="text-[10px] truncate" style={{ color:'rgba(224,231,255,0.6)' }}>{track.artist}</p>
      </div>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setPlaying((p) => !p)}
          className="flex-1 rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          style={{ background: playing ? 'rgba(99,102,241,0.25)' : '#6366f1', color:'#e0e7ff' }}>
          <span>{playing ? '⏸' : '▶'}</span>
          {playing ? (lang === 'hi' ? 'रोकें' : 'Pause') : (lang === 'hi' ? 'चलाएं' : 'Play')}
        </button>
        <button onClick={() => setMuted((m) => !m)}
          className="w-9 rounded-lg flex items-center justify-center text-sm transition-all"
          style={{ background:'rgba(99,102,241,0.2)', color: muted ? '#f87171' : '#a5b4fc' }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <div className="flex gap-1 mb-2">
        {LOFI_TRACKS.map((t, i) => (
          <button key={i} onClick={() => setTrackIdx(i)}
            className="flex-1 rounded-lg py-1 text-[9px] font-semibold truncate transition-all"
            style={{ background: i === trackIdx ? '#6366f1' : 'rgba(99,102,241,0.15)', color: i === trackIdx ? '#fff' : '#a5b4fc', border: i === trackIdx ? '1px solid #818cf8' : '1px solid transparent' }}>
            {t.title}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color:'rgba(199,210,254,0.5)' }}>🔈</span>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
          onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
          className="flex-1 h-1 rounded-full cursor-pointer" style={{ accentColor:'#818cf8' }} />
        <span className="text-[10px]" style={{ color:'rgba(199,210,254,0.5)' }}>🔉</span>
      </div>
    </div>
  )
}

function RegisterMerchantModal({ onClose, onRegister, lang }: {
  onClose: () => void; onRegister: (m: Merchant) => void; lang: Lang
}) {
  const [rName, setRName] = useState('')
  const [rHandle, setRHandle] = useState('')
  const [rEmoji, setREmoji] = useState('☕')
  const [rAddress, setRAddress] = useState('')
  const [rAmount, setRAmount] = useState('0.5')
  const [err, setErr] = useState('')
  const handleSubmit = () => {
    if (!rName.trim()) { setErr(lang === 'hi' ? 'नाम आवश्यक है' : 'Name is required'); return }
    if (!/^0x[0-9a-fA-F]{40}$/.test(rAddress.trim())) { setErr(lang === 'hi' ? 'मान्य वॉलेट पता दर्ज करें' : 'Enter a valid wallet address'); return }
    onRegister({ name: rName.trim(), handle: rHandle.trim() || `@${rName.trim().toLowerCase().replace(/\s+/g, '_')}`, emoji: rEmoji, address: rAddress.trim() as `0x${string}`, defaultAmount: rAmount })
  }
  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(148,163,184,0.25)', color: '#1e293b' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-base" style={{ color: '#122D45' }}>{lang === 'hi' ? '🏪 नया व्यापारी जोड़ें' : '🏪 Register New Merchant'}</p>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: '#64748b' }}>{lang === 'hi' ? 'नाम *' : 'Name *'}</label>
            <input value={rName} onChange={(e) => setRName(e.target.value)} maxLength={30} placeholder={lang === 'hi' ? 'रमेश चाईवाला' : 'Ramesh Chaiwala'} className="w-full mt-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold" style={{ color: '#64748b' }}>{lang === 'hi' ? 'हैंडल' : 'Handle'}</label>
              <input value={rHandle} onChange={(e) => setRHandle(e.target.value)} maxLength={20} placeholder="@ramesh_chai" className="w-full mt-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: '#64748b' }}>{lang === 'hi' ? 'इमोजी' : 'Emoji'}</label>
              <input value={rEmoji} onChange={(e) => setREmoji(e.target.value)} maxLength={2} className="w-full mt-1 rounded-xl px-3 py-2 text-sm outline-none text-center" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: '#64748b' }}>{lang === 'hi' ? 'वॉलेट पता *' : 'Wallet Address *'}</label>
            <input value={rAddress} onChange={(e) => setRAddress(e.target.value)} maxLength={42} placeholder="0x..." className="w-full mt-1 rounded-xl px-3 py-2 text-xs outline-none mono" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: '#64748b' }}>{lang === 'hi' ? 'डिफ़ॉल्ट राशि (USDC)' : 'Default Amount (USDC)'}</label>
            <input value={rAmount} onChange={(e) => setRAmount(e.target.value)} type="number" min="0.1" step="0.1" className="w-full mt-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          {err && <p className="text-xs" style={{ color: '#dc2626' }}>{err}</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: '#f1f5f9', color: '#64748b' }}>{lang === 'hi' ? 'रद्द करें' : 'Cancel'}</button>
          <button onClick={handleSubmit} className="flex-[2] rounded-xl py-2.5 text-sm font-bold" style={{ background: '#6366f1', color: '#fff' }}>{lang === 'hi' ? '✅ जोड़ें' : '✅ Register'}</button>
        </div>
      </div>
    </div>
  )
}

function KulhadNftModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const s = strings[lang]
  const [claimed, setClaimed] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-3xl p-6 w-full max-w-sm text-center" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', boxShadow: '0 32px 80px rgba(99,102,241,0.4)', border: '1px solid rgba(167,139,250,0.3)' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏺</div>
        <p className="font-black text-xl mb-1" style={{ color: '#f5f3ff' }}>{s.nftPassTitle}</p>
        <p className="text-xs mb-4" style={{ color: '#c4b5fd' }}>{s.nftPassSubtitle}</p>
        <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(167,139,250,0.2)' }}>
          {s.nftPassPerks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span style={{ color: '#a78bfa', fontSize: 14 }}>✦</span>
              <span className="text-xs" style={{ color: '#e9d5ff' }}>{perk}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setClaimed(true)}
          className="w-full rounded-xl py-3 text-sm font-bold mb-3"
          style={{ background: claimed ? 'rgba(34,197,94,0.3)' : 'linear-gradient(90deg,#7c3aed,#6366f1)', color: '#fff', border: claimed ? '1px solid #22c55e' : 'none' }}>
          {claimed ? s.nftPassClaimed : s.nftPassClaim}
        </button>
        <button onClick={onClose} className="w-full rounded-xl py-2 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: '#c4b5fd' }}>
          {lang === 'hi' ? 'बंद करें' : 'Close'}
        </button>
      </div>
    </div>
  )
}

function RoyaltyConsole({ lang, onClose, royaltyKey, setRoyaltyKey, royaltyUnlocked, royaltyKeyError, onUnlock, displayTotal, displayTipCount }: {
  lang: Lang; onClose: () => void; royaltyKey: string; setRoyaltyKey: (v: string) => void; royaltyUnlocked: boolean; royaltyKeyError: boolean; onUnlock: () => void; displayTotal: string; displayTipCount: number
}) {
  const s = strings[lang]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-3xl p-6 w-full max-w-sm" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(251,191,36,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-sm" style={{ color: '#fbbf24' }}>{s.royaltyTitle}</p>
          <button onClick={onClose} style={{ color: '#64748b' }}>✕</button>
        </div>
        {!royaltyUnlocked ? (
          <div>
            <p className="text-xs mb-3 text-center" style={{ color: '#94a3b8' }}>{s.royaltyLocked}</p>
            <input value={royaltyKey} onChange={e => setRoyaltyKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onUnlock() }}
              placeholder={s.royaltyKeyPlaceholder} type="password"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-center font-mono mb-2 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${royaltyKeyError ? '#ef4444' : 'rgba(148,163,184,0.2)'}`, color: '#f1f5f9' }} />
            {royaltyKeyError && <p className="text-xs text-center mb-2" style={{ color: '#ef4444' }}>{s.royaltyWrongKey}</p>}
            <button onClick={onUnlock} className="w-full rounded-xl py-2.5 text-sm font-bold"
              style={{ background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff' }}>{s.royaltyUnlock}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-center mb-1" style={{ color: '#4ade80' }}>{s.royaltyWelcome}</p>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: '#94a3b8' }}>Total Collected</span>
                <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{displayTotal} USDC</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: '#94a3b8' }}>Total Orders</span>
                <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{displayTipCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#94a3b8' }}>Contract</span>
                <span className="text-xs mono" style={{ color: '#7c3aed' }}>0x3380…a43d</span>
              </div>
            </div>
            <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function VillageBanner({ lang, onNftClick, onRoyaltyClick, onEmergencyClick, onBaithakClick, onGiftClick, freeChaiPool }: {
  lang: Lang; onNftClick: () => void; onRoyaltyClick: () => void; onEmergencyClick: () => void; onBaithakClick: () => void; onGiftClick: () => void; freeChaiPool: number
}) {
  const s = strings[lang]
  return (
    <div className="relative mb-4 rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg,#7c2d12 0%,#9a3412 15%,#b45309 32%,#92400e 50%,#78350f 68%,#6b2d0f 82%,#431407 100%)',
      boxShadow: '0 12px 40px rgba(120,53,15,0.5), inset 0 1px 0 rgba(251,191,36,0.2)', minHeight: 148,
    }}>
      <div className="absolute top-0 left-0 right-0 flex justify-center py-1 gap-0.5 flex-wrap z-10">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} style={{ fontSize: 10, opacity: 0.95 }}>{i % 3 === 0 ? '🌸' : '🌼'}</span>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-4 pb-1">
        <span style={{ fontSize: 28 }}>🏡</span>
        <span style={{ fontSize: 24 }}>☕</span>
        <span style={{ fontSize: 24 }}>🥟</span>
        <span style={{ fontSize: 28 }}>⛩️</span>
        <span style={{ fontSize: 24 }}>🌴</span>
      </div>
      <div className="relative z-10 px-5 pt-7 pb-3 flex flex-col items-center">
        <p className="font-black text-2xl tracking-wide text-center" style={{
          color: '#fef3c7',
          textShadow: '0 1px 0 #431407, 0 2px 0 #3d1106, 0 3px 0 #361005, 0 4px 8px rgba(0,0,0,0.5), 0 0 20px rgba(251,191,36,0.3)',
          letterSpacing: '0.04em',
        }}>
          ☕ चाय का चंदा
        </p>
        <p className="text-xs text-center mt-0.5 font-semibold" style={{ color: '#fed7aa', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {s.appName} • Indian Railways Platform No. 1
        </p>
        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          <button onClick={onNftClick} className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105" style={{ background: 'rgba(99,102,241,0.75)', color: '#e9d5ff', border: '1px solid rgba(167,139,250,0.4)' }}>🏺 NFT Pass</button>
          <button onClick={onRoyaltyClick} className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105" style={{ background: 'rgba(217,119,6,0.75)', color: '#fef9c3', border: '1px solid rgba(251,191,36,0.4)' }}>🔑 Master Key</button>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105" style={{ background: 'rgba(20,184,166,0.75)', color: '#f0fdfa', border: '1px solid rgba(45,212,191,0.4)', textDecoration: 'none' }}>💧 Faucet</a>
          <button onClick={onEmergencyClick} className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105" style={{ background: 'rgba(220,38,38,0.75)', color: '#fee2e2', border: '1px solid rgba(252,165,165,0.4)' }}>🚨 Emergency</button>
          <button onClick={onBaithakClick} className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105" style={{ background: 'rgba(5,150,105,0.75)', color: '#d1fae5', border: '1px solid rgba(52,211,153,0.4)' }}>🪑 बैठक बुक</button>
          <button onClick={onGiftClick} className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105" style={{ background: 'rgba(180,83,9,0.75)', color: '#fef3c7', border: '1px solid rgba(251,191,36,0.4)' }}>🎁 Gift Chai</button>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
          {[
            { label: '🐄 गाय का शुद्ध दूध', bg: 'rgba(245,158,11,0.25)', border: 'rgba(251,191,36,0.5)' },
            { label: '🏺 माटी की सुगंध',     bg: 'rgba(180,83,9,0.25)',  border: 'rgba(217,119,6,0.5)'  },
            { label: '🌐 Web3 Settled',       bg: 'rgba(20,184,166,0.2)', border: 'rgba(45,212,191,0.45)'},
          ].map(b => (
            <span key={b.label} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: b.bg, color: '#fef9c3', border: `1.5px solid ${b.border}` }}>{b.label}</span>
          ))}
          <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(34,197,94,0.22)', color: '#d1fae5', border: '1.5px solid rgba(52,211,153,0.5)' }}>
            🏺 {lang === 'hi' ? `मुफ्त चाय: ${freeChaiPool}` : `Free Chais: ${freeChaiPool}`}
          </span>
        </div>
      </div>
    </div>
  )
}

const EMERGENCY_TYPES = [
  { key: 'medical', emoji: '🚑', hi: 'मेडिकल / फर्स्ट एड', en: 'Medical / First Aid' },
  { key: 'ride',    emoji: '🛺', hi: 'क्विक राइड / ऑटो',   en: 'Quick Ride / Auto' },
  { key: 'power',   emoji: '🔋', hi: 'इमरजेंसी पावरबैंक',  en: 'Emergency Powerbank' },
  { key: 'water',   emoji: '💧', hi: 'इमरजेंसी पानी',       en: 'Emergency Water' },
]
function EmergencyAssistModal({ lang, onClose, onPay }: { lang: Lang; onClose: () => void; onPay: (type: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [alerting, setAlerting] = useState(false)
  const [dot, setDot] = useState(0)
  useEffect(() => {
    if (!alerting) return
    const t = setInterval(() => setDot(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [alerting])
  const handleRequest = () => {
    if (!selected) return
    setAlerting(true)
    setTimeout(() => { onPay(selected); onClose() }, 3000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', border: '2px solid rgba(167,139,250,0.4)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-lg" style={{ color: '#e9d5ff' }}>🚨 {lang === 'hi' ? 'इमरजेंसी क्विक मदद' : 'Emergency Quick Assist'}</p>
          <button onClick={onClose} className="text-purple-300 hover:text-white text-xl font-bold">✕</button>
        </div>
        {alerting ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 animate-pulse">🚨</div>
            <p className="font-black text-lg mb-2" style={{ color: '#fbbf24' }}>
              {lang === 'hi' ? 'नेटवर्क अलर्ट हो रहा है' : 'Alerting Nearby Network'}
              {'...'.slice(0, dot + 1)}
            </p>
            <p className="text-sm" style={{ color: '#c4b5fd' }}>{lang === 'hi' ? 'देसी नेटवर्क से जोड़ा जा रहा है…' : 'Connecting to Desi Network…'}</p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: '#c4b5fd' }}>{lang === 'hi' ? 'अपनी ज़रूरत चुनें — सिर्फ 0.10 USDC में तुरंत मदद' : 'Select your need — instant help for just 0.10 USDC'}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {EMERGENCY_TYPES.map(t => (
                <button key={t.key} onClick={() => setSelected(t.key)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{ background: selected === t.key ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.05)', border: `2px solid ${selected === t.key ? 'rgba(167,139,250,0.8)' : 'rgba(167,139,250,0.2)'}` }}>
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <p className="text-xs font-bold" style={{ color: '#e9d5ff' }}>{lang === 'hi' ? t.hi : t.en}</p>
                </button>
              ))}
            </div>
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <UsdcIcon size={16} />
              <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>0.10 USDC {lang === 'hi' ? 'माइक्रो-ट्रांज़ैक्शन' : 'micro-transaction'}</span>
            </div>
            <button onClick={handleRequest} disabled={!selected}
              className="w-full rounded-xl py-3 font-black text-sm transition-all"
              style={{ background: selected ? 'linear-gradient(135deg,#7c3aed,#dc2626)' : 'rgba(255,255,255,0.1)', color: selected ? '#fff' : '#6b7280', cursor: selected ? 'pointer' : 'not-allowed' }}>
              🚨 {lang === 'hi' ? 'तुरंत अलर्ट भेजें' : 'Send Emergency Alert'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const TIME_SLOTS = ['9:00 AM','10:00 AM','11:00 AM','12:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM']
const SEATS = [
  { key: 'khat',    emoji: '🛏️', hi: 'खाट / चारपाई',      en: 'Khat / Charpai' },
  { key: 'kulhad',  emoji: '🏺', hi: 'कुल्हड़ बेंच',         en: 'Kulhad Bench' },
  { key: 'corner',  emoji: '🪑', hi: 'कॉर्नर सीट',           en: 'Corner Seat' },
]
function BaithakBookingModal({ lang, onClose, onBook }: { lang: Lang; onClose: () => void; onBook: (slot: string, seat: string) => void }) {
  const [slot, setSlot] = useState<string | null>(null)
  const [seat, setSeat] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', border: '2px solid rgba(52,211,153,0.4)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-lg" style={{ color: '#d1fae5' }}>🪑 {lang === 'hi' ? 'बैठक रिज़र्व करें' : 'Book a Baithak'}</p>
          <button onClick={onClose} className="text-emerald-300 hover:text-white text-xl font-bold">✕</button>
        </div>
        <p className="text-xs mb-3" style={{ color: '#6ee7b7' }}>{lang === 'hi' ? '0.50 USDC रिफंडेबल डिपॉज़िट — बैठक कन्फर्म करें' : '0.50 USDC refundable deposit — secure your spot'}</p>
        <p className="text-xs font-bold mb-2" style={{ color: '#a7f3d0' }}>{lang === 'hi' ? '⏰ टाइम स्लॉट चुनें:' : '⏰ Choose Time Slot:'}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => setSlot(t)}
              className="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
              style={{ background: slot === t ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)', border: `1px solid ${slot === t ? 'rgba(52,211,153,0.8)' : 'rgba(52,211,153,0.2)'}`, color: slot === t ? '#d1fae5' : '#6ee7b7' }}>
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs font-bold mb-2" style={{ color: '#a7f3d0' }}>{lang === 'hi' ? '🪑 सीट टाइप चुनें:' : '🪑 Choose Seat Type:'}</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {SEATS.map(s => (
            <button key={s.key} onClick={() => setSeat(s.key)}
              className="rounded-xl p-2.5 text-center transition-all"
              style={{ background: seat === s.key ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.05)', border: `2px solid ${seat === s.key ? 'rgba(52,211,153,0.8)' : 'rgba(52,211,153,0.2)'}` }}>
              <div className="text-xl mb-0.5">{s.emoji}</div>
              <p className="text-xs font-bold" style={{ color: '#d1fae5' }}>{lang === 'hi' ? s.hi : s.en}</p>
            </button>
          ))}
        </div>
        <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <UsdcIcon size={16} />
          <span className="text-sm font-bold" style={{ color: '#6ee7b7' }}>0.50 USDC {lang === 'hi' ? 'रिफंडेबल' : 'refundable deposit'}</span>
        </div>
        <button onClick={() => { if (slot && seat) { onBook(slot, seat); onClose() } }}
          disabled={!slot || !seat}
          className="w-full rounded-xl py-3 font-black text-sm"
          style={{ background: slot && seat ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(255,255,255,0.1)', color: slot && seat ? '#fff' : '#6b7280', cursor: slot && seat ? 'pointer' : 'not-allowed' }}>
          🪑 {lang === 'hi' ? 'बैठक बुक करें — 0.50 USDC' : 'Book Baithak — 0.50 USDC'}
        </button>
      </div>
    </div>
  )
}

const GIFT_OPTIONS = [
  { key: 'chai',  emoji: '☕', hi: 'कटिंग चाय',       en: 'Cutting Chai',    amount: '0.25' },
  { key: 'combo', emoji: '🥟', hi: 'समोसा कॉम्बो',     en: 'Samosa Combo',   amount: '0.75' },
]
function GiftChaiModal({ lang, onClose, onGift }: { lang: Lang; onClose: () => void; onGift: (to: string, item: string, amount: string) => void }) {
  const [to, setTo] = useState('')
  const [item, setItem] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [ticketId] = useState(() => '#CHAI-' + Math.random().toString(36).slice(2,8).toUpperCase())
  const handleSend = () => {
    if (!to.trim() || !item) return
    const opt = GIFT_OPTIONS.find(o => o.key === item)!
    onGift(to.trim(), item, opt.amount)
    setSent(true)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'linear-gradient(135deg,#7c2d12,#92400e)', border: '2px solid rgba(251,191,36,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-lg" style={{ color: '#fef3c7' }}>🎁 {lang === 'hi' ? 'दोस्त को चाय गिफ्ट करें' : 'Gift a Chai'}</p>
          <button onClick={onClose} className="text-amber-300 hover:text-white text-xl font-bold">✕</button>
        </div>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🎫</div>
            <p className="font-black text-lg mb-1" style={{ color: '#fbbf24' }}>{lang === 'hi' ? 'गिफ्ट चाय भेज दी!' : 'Chai Gift Sent!'}</p>
            <div className="rounded-xl p-4 my-3" style={{ background: 'rgba(251,191,36,0.15)', border: '2px dashed rgba(251,191,36,0.5)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#fde68a' }}>🎫 CHAI GIFT TOKEN SLIP</p>
              <p className="font-black text-xl" style={{ color: '#fbbf24' }}>{ticketId}</p>
              <p className="text-xs mt-1" style={{ color: '#fef3c7' }}>{lang === 'hi' ? 'प्राप्तकर्ता:' : 'To:'} {to.length > 12 ? to.slice(0,8)+'…'+to.slice(-4) : to}</p>
            </div>
            <button onClick={onClose} className="rounded-xl px-6 py-2 font-bold text-sm mt-2" style={{ background: '#d97706', color: '#fff' }}>
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'दोस्त का वॉलेट/हैंडल डालें और गिफ्ट करें' : "Enter friend's wallet/handle and gift instantly"}</p>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder={lang === 'hi' ? '0x... या @handle' : '0x... or @handle'}
              className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fef3c7' }} />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {GIFT_OPTIONS.map(o => (
                <button key={o.key} onClick={() => setItem(o.key)}
                  className="rounded-xl p-3 text-center transition-all"
                  style={{ background: item === o.key ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)', border: `2px solid ${item === o.key ? 'rgba(251,191,36,0.8)' : 'rgba(251,191,36,0.2)'}` }}>
                  <div className="text-2xl mb-1">{o.emoji}</div>
                  <p className="text-xs font-bold" style={{ color: '#fef3c7' }}>{lang === 'hi' ? o.hi : o.en}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <UsdcIcon size={10} />
                    <span className="text-xs font-black" style={{ color: '#fbbf24' }}>{o.amount}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleSend} disabled={!to.trim() || !item}
              className="w-full rounded-xl py-3 font-black text-sm"
              style={{ background: to.trim() && item ? 'linear-gradient(135deg,#d97706,#b45309)' : 'rgba(255,255,255,0.1)', color: to.trim() && item ? '#fff' : '#6b7280', cursor: to.trim() && item ? 'pointer' : 'not-allowed' }}>
              🎁 {lang === 'hi' ? 'चाय गिफ्ट करें' : 'Send Chai Gift'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface BoundaryState { hasError: boolean }
class ErrorBoundary extends Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(): BoundaryState { return { hasError: true } }
  override componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[TipJar]', error, info) }
  override render() {
    if (!this.state.hasError) return this.props.children
    const lang = (() => { try { return localStorage.getItem('chayChanda_lang') === 'en' ? 'en' : 'hi' } catch { return 'hi' } })()
    const s = strings[lang]
    return (
      <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: 'var(--bg-gradient)' }}>
        <div className="rounded-2xl p-8 text-center max-w-xs w-full" style={glass.card}>
          <AlertCircle size={36} className="mx-auto mb-3" style={{ color: 'var(--danger)' }} />
          <p className="font-bold mb-1" style={{ color: 'var(--ink)' }}>{s.errorBoundaryTitle}</p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{s.errorBoundaryMsg}</p>
          <button onClick={() => window.location.reload()} className="w-full rounded-xl py-2.5 text-sm font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>{s.errorBoundaryReload}</button>
        </div>
      </div>
    )
  }
}

function TipJarInner() {
  const { address, isConnected, chainId } = useAccount()
  const { error: connectError } = useConnect()
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
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  const { speak, muted, toggleMute } = useSpeech(lang)

  const [cart, setCart] = useState<CartMap>({})
  const [fulfillment, setFulfillment] = useState<Fulfillment>('dine-in')
  const totalStr = cartTotal(cart)
  const hasItems = parseFloat(totalStr) > 0

  const tipAmount = totalStr

  const [name, setName] = useState('')
  const [walletAddr, setWalletAddr] = useState('')
  const [message, setMessage] = useState('')
  const [vibeTag, setVibeTag] = useState<string | null>(null)

  const [step, setStep] = useState<TipStep>('idle')
  const [tipHash, setTipHash] = useState<`0x${string}` | null>(null)
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  const [feeEstimate, setFeeEstimate] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [showQr, setShowQr] = useState(false)
  const qrSupported = qrScanSupported()
  const [copied, setCopied] = useState(false)
  const [userBalanceDisplay, setUserBalanceDisplay] = useState<string | null>(null)
  const [showMerchants, setShowMerchants] = useState(false)
  const [qrMerchant, setQrMerchant] = useState<Merchant | null>(null)
  const [showRegisterMerchant, setShowRegisterMerchant] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [showBaithak, setShowBaithak] = useState(false)
  const [showGiftChai, setShowGiftChai] = useState(false)
  const [merchants, setMerchants] = useState<Merchant[]>(MERCHANTS)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const VALID_COUPONS: Record<string, number> = { 'CHAI10': 0.10, 'DESI20': 0.20 }
  const [showNftPass, setShowNftPass] = useState(false)
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [royaltyKey, setRoyaltyKey] = useState('')
  const [royaltyUnlocked, setRoyaltyUnlocked] = useState(false)
  const [royaltyKeyError, setRoyaltyKeyError] = useState(false)
  const [merchantSearch, setMerchantSearch] = useState('')
  const [welcomeShown, setWelcomeShown] = useState(false)
  const [freeChaiPool, setFreeChaiPool] = useState(0)
  const [claimingFreeChai, setClaimingFreeChai] = useState(false)

  const [myOrders, setMyOrders] = useState<MyOrder[]>([])
  const [lastOrder, setLastOrder] = useState<MyOrder | null>(null)
  const activeWalletRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (address !== activeWalletRef.current) {
      setMyOrders([])
      setLastOrder(null)
      activeWalletRef.current = address
    }
  }, [address])

  const [totalCollected, setTotalCollected] = useState<bigint | null>(null)
  const [tipsCount, setTipsCount] = useState<bigint | null>(null)
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null)
  const [readSeq, setReadSeq] = useState(0)

  const wasConnectedRef = useRef(isConnected)
  const [showConnectError, setShowConnectError] = useState(false)
  useEffect(() => {
    if (isConnected) { wasConnectedRef.current = true; setShowConnectError(false) }
    else { if (connectError && !wasConnectedRef.current) setShowConnectError(true); wasConnectedRef.current = false }
  }, [isConnected, connectError])

  useEffect(() => {
    if (!isConnected) {
      purgeWagmiCache()
      queueMicrotask(() => {
        setStep('idle'); setName(''); setWalletAddr(''); setMessage('')
        setCart({}); setTipHash(null); setPendingHash(null)
        setFeeEstimate(null); setUserBalanceDisplay(null)
        setShowConnectError(false); setTotalCollected(null)
        setTipsCount(null); setVibeTag(null)
        setShowMerchants(false); setQrMerchant(null)
        setMyOrders([]); setLastOrder(null)
      })
    }
  }, [isConnected])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    type EP = { on: (e: string, cb: (a: string[]) => void) => void; removeListener: (e: string, cb: (a: string[]) => void) => void }
    const provider = window.ethereum as EP
    const handler = (accounts: string[]) => { if (accounts.length === 0) { purgeWagmiCache(); disconnect() } }
    try { provider.on('accountsChanged', handler) } catch {}
    return () => { try { provider.removeListener('accountsChanged', handler) } catch {} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isWrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID
  const isBusy = step === 'tipping' || step === 'pending-tip'

  const { data: receiptData, status: receiptStatus } = useWaitForTransactionReceipt({
    hash: pendingHash ?? undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!pendingHash && step === 'pending-tip' },
  })

  const refetchAll = useCallback(() => { setReadSeq((n) => n + 1); void refetchBalance() }, [refetchBalance])
  const refetchAllRef = useRef(refetchAll)
  useEffect(() => { refetchAllRef.current = refetchAll }, [refetchAll])

  const finalMessage = (vibeTag ? `${vibeTag} — ` : '') + (message.trim() || cartSummaryLine(cart, s).slice(0, 60))
  const finalMessageRef = useRef(finalMessage)
  useEffect(() => { finalMessageRef.current = finalMessage }, [finalMessage])

  const tipAmountRef = useRef(tipAmount)
  useEffect(() => { tipAmountRef.current = tipAmount }, [tipAmount])
  const vibeTagRef = useRef(vibeTag)
  useEffect(() => { vibeTagRef.current = vibeTag }, [vibeTag])

  const cartRef = useRef(cart)
  useEffect(() => { cartRef.current = cart }, [cart])

  const fulfillmentRef = useRef(fulfillment)
  useEffect(() => { fulfillmentRef.current = fulfillment }, [fulfillment])

  useEffect(() => {
    if (step !== 'pending-tip' || !pendingHash) return
    if (receiptStatus === 'success' && receiptData) {
      if (receiptData.status === 'reverted') {
        const sl = strings[langRef.current]
        setStep('idle'); toast.error(sl.txFailed); speak(sl.txFailed)
      } else {
        const order: MyOrder = {
          txHash: pendingHash, amount: tipAmountRef.current,
          message: finalMessageRef.current, fulfillment: fulfillmentRef.current,
          cartLine: cartSummaryLine(cartRef.current, strings[langRef.current]),
          timestamp: Date.now(),
        }
        setTipHash(pendingHash); setPendingHash(null); setStep('done')
        setLastOrder(order)
        setMyOrders((prev) => [order, ...prev].slice(0, 20))
        if (vibeTagRef.current === 'ekAurCup') setFreeChaiPool(p => p + 1)
        refetchAllRef.current(); speak(strings[langRef.current].thankYouSpoken)
      }
    } else if (receiptStatus === 'error') {
      const sl = strings[langRef.current]
      setStep('timed-out'); toast.error(sl.txTimeout); speak(sl.txTimeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptStatus, receiptData])

  useEffect(() => {
    if (step !== 'pending-tip' || !pendingHash) return
    const timer = setTimeout(() => {
      const order: MyOrder = {
        txHash: pendingHash, amount: tipAmountRef.current,
        message: finalMessageRef.current, fulfillment: fulfillmentRef.current,
        cartLine: cartSummaryLine(cartRef.current, strings[langRef.current]),
        timestamp: Date.now(),
      }
      setTipHash(pendingHash); setPendingHash(null); setStep('done')
      setLastOrder(order)
      setMyOrders((prev) => [order, ...prev].slice(0, 20))
      if (vibeTagRef.current === 'ekAurCup') setFreeChaiPool(p => p + 1)
      refetchAllRef.current(); toast(strings[langRef.current].txTimeout, { duration: 6000 })
    }, 12_000)
    return () => clearTimeout(timer)
  }, [step, pendingHash])

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      try {
        const [tot, cnt, owner] = await Promise.all([
          arcPublicClient.readContract({ address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'totalCollected' }) as Promise<bigint>,
          arcPublicClient.readContract({ address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'getTipsCount' }) as Promise<bigint>,
          arcPublicClient.readContract({ address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'getOwner' }) as Promise<string>,
        ])
        if (!cancelled) { setTotalCollected(tot); setTipsCount(cnt); setOwnerAddress(owner) }
      } catch {}
    }
    void read()
    const timer = setInterval(() => { void read() }, 3_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [readSeq])

  useEffect(() => {
    if (!isConnected || !balanceData) { setUserBalanceDisplay(null); return }
    setUserBalanceDisplay(parseFloat(formatEther(balanceData.value)).toFixed(2))
  }, [isConnected, balanceData])

  const handleLangToggle = (next: Lang) => {
    setLangState(next); saveLang(next)
    if (!muted && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(strings[next].langSwitchConfirm)
        utt.lang = next === 'hi' ? 'hi-IN' : 'en-IN'
        window.speechSynthesis.speak(utt)
      } catch {}
    }
  }

  const handleMuteToggle = () => {
    const nextMuted = !muted
    if (!nextMuted && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(strings[lang].unmuteLabel)
        utt.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
        window.speechSynthesis.speak(utt)
      } catch {}
    }
    toggleMute()
  }

  const handleSwitchToArc = async () => {
    speak(s.switchNetwork)
    const hexChainId = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`
    if (typeof window === 'undefined' || !window.ethereum) { void switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    try {
      await (window.ethereum as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> })
        .request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
    } catch (switchErr) {
      const code = (switchErr as { code?: number })?.code
      if (code === 4902 || code === -32603) {
        try {
          await (window.ethereum as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> })
            .request({ method: 'wallet_addEthereumChain', params: [{ chainId: hexChainId, chainName: 'Arc Testnet', rpcUrls: [ARC_RPC], nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, blockExplorerUrls: [arcChain.explorerBase] }] })
        } catch {}
      } else { try { void switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) } catch {} }
    }
  }

  const handleCopyOwner = async () => {
    if (!ownerAddress) return
    try { await navigator.clipboard.writeText(ownerAddress); setCopied(true); speak(s.copied); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const handleQrResult = (value: string) => {
    setShowQr(false)
    const cleaned = value.startsWith('ethereum:') ? value.slice(9).split('@')[0] : value
    setWalletAddr(cleaned.slice(0, 42))
  }

  const handleMerchantSelect = (m: Merchant) => {
    setWalletAddr(m.address); setName(m.name)
    setCart({ chai: 1 }); setShowMerchants(false); speak(m.name)
  }

  const adjustCart = (key: MenuItem['key'], delta: number) => {
    setCart((prev) => {
      const cur = prev[key] ?? 0
      const next = Math.max(0, cur + delta)
      const updated = { ...prev, [key]: next }
      if (next === 0) delete updated[key]
      return updated
    })
    speak(getMenuLabel(key, s))
  }

  const validate = (): string | null => {
    const v = parseFloat(tipAmount)
    if (isNaN(v) || v < MINIMUM_DISPLAY) return s.errMin
    if (!vibeTag && !message.trim() && !hasItems) return s.errEmptyMsg
    if (message.trim().length > 80) return s.errMsgLong
    return null
  }

  const handleOpenSummary = async () => {
    if (isWrongChain) { speak(s.switchNetwork); return }
    const err = validate()
    if (err) { toast.error(err); speak(err); return }
    setSummaryLoading(true); setStep('summary')
    if (publicClient && address) {
      try { const bal = await publicClient.getBalance({ address }); setUserBalanceDisplay(parseFloat(formatEther(bal)).toFixed(2)) } catch {}
      try {
        const gasPrice = await publicClient.getGasPrice()
        const feeWei = gasPrice * 100_000n
        const feeEth = parseFloat(formatEther(feeWei))
        setFeeEstimate(feeEth < 0.00001 ? '< 0.00001' : feeEth.toFixed(5))
      } catch { setFeeEstimate(null) }
    }
    setSummaryLoading(false)
  }

  const handleTip = async () => {
    if (!walletClient || !address) return
    if (isWrongChain) { speak(s.switchNetwork); return }
    speak(s.sendTip(tipAmount || '0'))
    const erc20Units = parseErc20(tipAmount)
    const nativeValue = toNative(erc20Units)
    const rawAddr = walletAddr.trim(); const rawName = name.trim()
    const isEvmAddr = /^0x[0-9a-fA-F]{40}$/.test(rawAddr)
    const tipName = rawAddr
      ? isEvmAddr ? formatAddress(rawAddr) : rawAddr.slice(0, 30)
      : rawName ? (rawName.length > 30 ? rawName.slice(0, 29) + '…' : rawName) : formatAddress(address)
    setStep('tipping'); setPendingHash(null)
    let txHash: `0x${string}`
    try {
      txHash = await walletClient.writeContract({
        address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'tip',
        args: [tipName, finalMessage.slice(0, 80)], value: nativeValue,
        maxFeePerGas: parseUnits('20', 9),
        maxPriorityFeePerGas: parseUnits('2', 9),
      })
    } catch (e: unknown) {
      setStep('idle')
      const msg = parseOnchainError(e, langRef.current)
      toast.error(msg); speak(msg); return
    }
    setPendingHash(txHash); setStep('pending-tip')
  }

  useEffect(() => {
    if (!welcomeShown) {
      const t = setTimeout(() => {
        toast(strings[langRef.current].welcomeToast, { duration: 5000, icon: '☕' })
        speak(strings[langRef.current].welcomeToast)
        setWelcomeShown(true)
      }, 1200)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApplyCoupon = () => {
    const key = couponCode.toUpperCase()
    if (VALID_COUPONS[key] != null) {
      const pct = Math.round(VALID_COUPONS[key] * 100)
      setCouponApplied(true)
      setCouponDiscount(VALID_COUPONS[key])
      toast.success(s.couponSuccess(pct))
      speak(s.couponSuccess(pct))
    } else {
      toast.error(s.couponInvalid)
      speak(s.couponInvalid)
    }
  }

  const handleRoyaltyUnlock = () => {
    if (royaltyKey === 'ARC2026') {
      setRoyaltyUnlocked(true)
      setRoyaltyKeyError(false)
      toast.success(s.royaltyWelcome)
      speak(s.royaltyWelcome)
    } else {
      setRoyaltyKeyError(true)
      toast.error(s.royaltyWrongKey)
    }
  }

  const handleRegisterMerchant = (m: Merchant) => {
    setMerchants(prev => [...prev, m])
    setShowRegisterMerchant(false)
    toast.success(s.registerMerchantSuccess)
  }

  const handleReset = () => {
    speak(s.sendAnother); setStep('idle'); setName(''); setWalletAddr('')
    setMessage(''); setCart({}); setTipHash(null); setPendingHash(null)
    setFeeEstimate(null); setVibeTag(null); setLastOrder(null)
  }

  const formattedTotal = totalCollected != null ? formatNativeUsdc(totalCollected) : '0.00'
  const displayTotal = isConnected ? formattedTotal : '0.00'
  const displayTipCount = isConnected && tipsCount != null ? Number(tipsCount) : 0
  const isLowBalance = userBalanceDisplay != null && parseFloat(userBalanceDisplay) < LOW_BALANCE_THRESHOLD
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const _effectiveTipAmount = couponDiscount > 0
    ? Math.max(0, parseFloat(totalStr) * (1 - couponDiscount)).toFixed(2)
    : totalStr

  return (
    <>
      {showQr && <QrScanner onResult={handleQrResult} onClose={() => setShowQr(false)} cancelLabel={s.scanQrCancel} />}
      {showNftPass && <KulhadNftModal lang={lang} onClose={() => setShowNftPass(false)} />}
      {showRoyaltyConsole && <RoyaltyConsole lang={lang} onClose={() => setShowRoyaltyConsole(false)} royaltyKey={royaltyKey} setRoyaltyKey={setRoyaltyKey} royaltyUnlocked={royaltyUnlocked} royaltyKeyError={royaltyKeyError} onUnlock={handleRoyaltyUnlock} displayTotal={displayTotal} displayTipCount={displayTipCount} />}
      {showRegisterMerchant && <RegisterMerchantModal lang={lang} onClose={() => setShowRegisterMerchant(false)} onRegister={handleRegisterMerchant} />}
      {showEmergency && <EmergencyAssistModal lang={lang} onClose={() => setShowEmergency(false)} onPay={(type) => { toast.success(lang === 'hi' ? `🚨 ${type} अलर्ट भेजा गया!` : `🚨 ${type} alert sent!`); setShowEmergency(false) }} />}
      {showBaithak && <BaithakBookingModal lang={lang} onClose={() => setShowBaithak(false)} onBook={(slot, seat) => { toast.success(lang === 'hi' ? `🪑 ${seat} ${slot} के लिए बुक हो गई!` : `🪑 ${seat} booked for ${slot}!`) }} />}
      {showGiftChai && <GiftChaiModal lang={lang} onClose={() => setShowGiftChai(false)} onGift={(to, item) => { toast.success(lang === 'hi' ? `🎁 ${item} गिफ्ट ${to.slice(0,8)}… को भेजी!` : `🎁 ${item} gifted to ${to.slice(0,8)}…!`) }} />}
      {qrMerchant && <MerchantQrModal merchant={qrMerchant} onClose={() => setQrMerchant(null)} closeLabel={s.merchantQrClose} title={s.merchantQrTitle} />}

      <div className="relative min-h-dvh overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:'absolute',top:'3%',left:'1%',width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(180,83,9,0.28) 0%,transparent 70%)',filter:'blur(90px)' }} />
          <div style={{ position:'absolute',top:'8%',right:'4%',width:340,height:340,borderRadius:'50%',background:'radial-gradient(circle,rgba(251,191,36,0.16) 0%,transparent 70%)',filter:'blur(80px)' }} />
          <div style={{ position:'absolute',top:'30%',right:'2%',width:320,height:320,
