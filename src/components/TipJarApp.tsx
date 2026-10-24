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

// ── Menu ───────────────────────────────────────────────────────────────────────
interface MenuItem {
  key: 'chai' | 'kulhadChai' | 'masalaChai' | 'samosa' | 'kachori' | 'lassi' | 'aloo' | 'combo' | 'kulhad'
  emoji: string
  price: string
  amount: string
  badge?: 'bestseller' | 'hot' | 'organic' | 'offer' | 'new'
  splitTag?: true
  color: string   // unique card accent color
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

// ── Vibe Tags ──────────────────────────────────────────────────────────────────
const VIBE_COLORS = [
  'rgba(245,158,11,0.12)', 'rgba(239,68,68,0.12)',
  'rgba(251,191,36,0.12)', 'rgba(99,102,241,0.12)', 'rgba(168,85,247,0.12)',
]
const VIBE_TEXT_COLORS = ['#d97706','#dc2626','#b45309','#6366f1','#9333ea']

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  mint: {
    background: '#f0fdf4',
    border: '1.5px solid rgba(22,163,74,0.30)',
    boxShadow: '0 4px 20px rgba(22,163,74,0.10)',
  } as React.CSSProperties,
  indigo: {
    background: '#faf5ff',
    border: '1.5px solid rgba(99,102,241,0.28)',
    boxShadow: '0 4px 20px rgba(99,102,241,0.10)',
  } as React.CSSProperties,
  amber: {
    background: '#fffbeb',
    border: '1.5px solid rgba(245,158,11,0.35)',
    boxShadow: '0 4px 20px rgba(245,158,11,0.12)',
  } as React.CSSProperties,
  dark: {
    background: 'rgba(40,21,12,0.97)',
    border: '1.5px solid rgba(245,158,11,0.35)',
    boxShadow: '0 6px 32px rgba(0,0,0,0.35)',
  } as React.CSSProperties,
}
const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

// ── Merchant QR Modal ──────────────────────────────────────────────────────────
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
    }).catch(() => { /* qrcode unavailable */ })
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

// ── Order Receipt Card ─────────────────────────────────────────────────────────
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
      {/* Status stepper */}
      <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
        {statusLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={i <= statusIdx
                ? { background: 'var(--success)', color: '#fff' }
                : { background: 'rgba(0,0,0,0.07)', color: 'var(--subtle)' }}>
              {i <= statusIdx ? '✓' : i + 1}
            </div>
            <span className="text-xs" style={{ color: i <= statusIdx ? 'var(--ink)' : 'var(--subtle)', fontWeight: i === statusIdx ? 700 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <button onClick={onNewOrder}
        className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
        style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
        {s.receiptNewOrder}
      </button>
    </div>
  )
}

// ── Chai Philosophy Card ───────────────────────────────────────────────────────
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

// ── USDC Icon ─────────────────────────────────────────────────────────────────
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

// ── Retro FM Radio Widget ──────────────────────────────────────────────────────
// Royalty-free lofi tracks (Internet Archive, CC0/Public Domain)
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

  // Sync play/pause with audio element
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.play().catch(() => setPlaying(false)) // browsers may block autoplay
    } else {
      el.pause()
    }
  }, [playing])

  // Sync volume and mute
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = muted ? 0 : volume
  }, [volume, muted])

  // Sync track source
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const wasPlaying = playing
    el.src = LOFI_TRACKS[trackIdx].src
    el.load()
    if (wasPlaying) el.play().catch(() => setPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx])

  // Equalizer animation when playing
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setBeat((b) => (b + 1) % 4), 400)
    return () => clearInterval(t)
  }, [playing])

  // Auto-advance track every 20s
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setTrackIdx((i) => (i + 1) % LOFI_TRACKS.length), 20_000)
    return () => clearInterval(t)
  }, [playing])

  const track = LOFI_TRACKS[trackIdx]

  return (
    <div className="rounded-2xl p-4" style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)', border:'2px solid rgba(99,102,241,0.35)', boxShadow:'0 4px 20px rgba(99,102,241,0.2)' }}>
      {/* Hidden HTML5 audio element */}
      <audio ref={audioRef} src={LOFI_TRACKS[trackIdx].src} preload="none" loop />

      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(99,102,241,0.3)' }}>
          <span className="text-lg">📻</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black" style={{ color:'#c7d2fe' }}>{lang === 'hi' ? 'देसी FM 92.7' : 'Desi FM 92.7'}</p>
          <p className="text-[10px]" style={{ color:'rgba(199,210,254,0.6)' }}>{lang === 'hi' ? 'लो-फाई चाय बीट्स' : 'Lo-Fi Chai Beats'}</p>
        </div>
        {/* Equalizer bars */}
        <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
          {[3,5,4,2,5,3,4].map((h, i) => (
            <div key={i} className="w-1 rounded-full transition-all duration-200"
              style={{ height: playing && beat > 0 ? `${(h + (beat + i) % 3) * 3}px` : '4px', background: playing ? '#818cf8' : 'rgba(129,140,248,0.3)' }} />
          ))}
        </div>
      </div>

      {/* Track info */}
      <div className="rounded-lg px-2 py-1.5 mb-2 overflow-hidden" style={{ background:'rgba(0,0,0,0.3)' }}>
        <p className="text-xs font-semibold truncate" style={{ color:'#e0e7ff' }}>{track.title}</p>
        <p className="text-[10px] truncate" style={{ color:'rgba(224,231,255,0.6)' }}>{track.artist}</p>
      </div>

      {/* Play/Pause + Mute row */}
      <div className="flex gap-2 mb-2">
        <button onClick={() => setPlaying((p) => !p)}
          className="flex-1 rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          style={{ background: playing ? 'rgba(99,102,241,0.25)' : '#6366f1', color:'#e0e7ff' }}>
          <span>{playing ? '⏸' : '▶'}</span>
          {playing ? (lang === 'hi' ? 'रोकें' : 'Pause') : (lang === 'hi' ? 'चलाएं' : 'Play')}
        </button>
        <button onClick={() => setMuted((m) => !m)}
          className="w-9 rounded-lg flex items-center justify-center text-sm transition-all"
          style={{ background:'rgba(99,102,241,0.2)', color: muted ? '#f87171' : '#a5b4fc' }}
          title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Track selector */}
      <div className="flex gap-1 mb-2">
        {LOFI_TRACKS.map((t, i) => (
          <button key={i} onClick={() => setTrackIdx(i)}
            className="flex-1 rounded-lg py-1 text-[9px] font-semibold truncate transition-all"
            style={{ background: i === trackIdx ? '#6366f1' : 'rgba(99,102,241,0.15)', color: i === trackIdx ? '#fff' : '#a5b4fc', border: i === trackIdx ? '1px solid #818cf8' : '1px solid transparent' }}>
            {t.title}
          </button>
        ))}
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color:'rgba(199,210,254,0.5)' }}>🔈</span>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
          onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
          className="flex-1 h-1 rounded-full cursor-pointer"
          style={{ accentColor:'#818cf8' }} />
        <span className="text-[10px]" style={{ color:'rgba(199,210,254,0.5)' }}>🔉</span>
      </div>
    </div>
  )
}

// ── Kulhad NFT Loyalty Pass ────────────────────────────────────────────────
function _KulhadNftPassCard({ orderCount, lang }: { orderCount: number; lang: Lang }) {
  const threshold = 5
  const progress = Math.min(orderCount, threshold)
  const unlocked = orderCount >= threshold
  return (
    <div className="rounded-2xl p-4 overflow-hidden relative" style={{
      background: unlocked
        ? 'linear-gradient(135deg,#1e3a6e,#0d5c5c,#7c3aed)'
        : 'linear-gradient(135deg,#1c1917,#292524)',
      border: `2px solid ${unlocked ? 'rgba(167,139,250,0.7)' : 'rgba(251,191,36,0.25)'}`,
      boxShadow: unlocked ? '0 4px 24px rgba(139,92,246,0.35)' : '0 2px 12px rgba(0,0,0,0.2)',
    }}>
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">{unlocked ? '🏺✨' : '🏺'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight" style={{ color: unlocked ? '#e9d5ff' : '#fef3c7' }}>
            {lang === 'hi' ? 'कुल्हड़ NFT लॉयल्टी पास' : 'Kulhad NFT Loyalty Pass'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: unlocked ? 'rgba(233,213,255,0.65)' : 'rgba(254,243,199,0.5)' }}>
            {unlocked
              ? (lang === 'hi' ? '🎉 अनलॉक! आप VIP चाय सदस्य हैं' : '🎉 Unlocked! You are a VIP Chai Member')
              : (lang === 'hi' ? `${threshold - progress} और ऑर्डर बाकी` : `${threshold - progress} more orders to unlock`)}
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(progress / threshold) * 100}%`, background: unlocked ? 'linear-gradient(90deg,#a78bfa,#34d399)' : 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} />
          </div>
          <p className="text-[10px] mt-1 tabular-nums" style={{ color: unlocked ? 'rgba(233,213,255,0.6)' : 'rgba(254,243,199,0.4)' }}>
            {progress}/{threshold} {lang === 'hi' ? 'ऑर्डर' : 'orders'}
          </p>
        </div>
      </div>
      {unlocked && (
        <div className="mt-3 rounded-lg px-3 py-2 text-center" style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(167,139,250,0.4)' }}>
          <p className="text-xs font-bold" style={{ color: '#ddd6fe' }}>
            {lang === 'hi' ? '🎁 फ्री कुल्हड़ चाय — अगले ऑर्डर पर' : '🎁 Free Kulhad Chai on your next order!'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Register Merchant Modal ────────────────────────────────────────────────
function RegisterMerchantModal({ onClose, onRegister, lang }: {
  onClose: () => void
  onRegister: (m: Merchant) => void
  lang: Lang
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

// ── Kulhad NFT Loyalty Pass Modal ──────────────────────────────────────────────
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

// ── Master Key Royalty Console ──────────────────────────────────────────────────
const OWNER_ADDRESS = '0x1C248d40eeA69a4662AF4F475D8dbA06d556f628'

function RoyaltyConsole({ lang, onClose, displayTotal, displayTipCount, connectedAddress }: {
  lang: Lang; onClose: () => void
  displayTotal: string; displayTipCount: number
  connectedAddress?: string
}) {
  const isOwner = !!connectedAddress && connectedAddress.toLowerCase() === OWNER_ADDRESS.toLowerCase()
  const [nomineeAddr, setNomineeAddr] = useState('')
  const [nomineeSaved, setNomineeSaved] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-3xl p-6 w-full max-w-sm" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(251,191,36,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-sm" style={{ color: '#fbbf24' }}>🔐 {lang === 'hi' ? 'ओनर कंट्रोल पैनल' : 'Owner Control Panel'}</p>
          <button onClick={onClose} style={{ color: '#64748b' }}>✕</button>
        </div>
        {!isOwner ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-sm font-semibold mb-1" style={{ color: '#fbbf24' }}>
              {lang === 'hi' ? 'ओनर वॉलेट आवश्यक है' : 'Owner Wallet Required'}
            </p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {lang === 'hi'
                ? 'यह पैनल केवल कॉन्ट्रैक्ट ओनर के वॉलेट से एक्सेस किया जा सकता है।'
                : 'This panel is only accessible from the contract owner wallet.'}
            </p>
            <p className="text-[10px] mt-2 mono" style={{ color: '#475569' }}>
              {OWNER_ADDRESS.slice(0,6)}…{OWNER_ADDRESS.slice(-4)}
            </p>
            <button onClick={onClose} className="mt-4 rounded-xl px-5 py-2 text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-center font-semibold" style={{ color: '#4ade80' }}>
              ✅ {lang === 'hi' ? 'ओनर वेरिफाइड' : 'Owner Verified'}
            </p>
            {/* Stats */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: '#94a3b8' }}>{lang === 'hi' ? 'कुल जमा' : 'Total Collected'}</span>
                <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{displayTotal} USDC</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: '#94a3b8' }}>{lang === 'hi' ? 'कुल ऑर्डर' : 'Total Orders'}</span>
                <span className="text-sm font-black" style={{ color: '#fbbf24' }}>{displayTipCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#94a3b8' }}>Contract</span>
                <span className="text-[10px] mono" style={{ color: '#7c3aed' }}>0xd385…197</span>
              </div>
            </div>
            {/* Nominee/backup address */}
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>
                {lang === 'hi' ? '🛡️ बैकअप नॉमिनी एड्रेस' : '🛡️ Backup Nominee Address'}
              </p>
              <input value={nomineeAddr} onChange={e => setNomineeAddr(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl px-3 py-2 text-xs font-mono outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(148,163,184,0.2)', color: '#f1f5f9' }} />
              <button
                onClick={() => { if (nomineeAddr.startsWith('0x')) { setNomineeSaved(true); setTimeout(() => setNomineeSaved(false), 3000) } }}
                className="w-full rounded-xl py-2 text-xs font-bold"
                style={{ background: nomineeSaved ? '#16a34a' : 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff' }}>
                {nomineeSaved ? (lang === 'hi' ? '✅ सेव हो गया' : '✅ Saved') : (lang === 'hi' ? 'नॉमिनी सेव करें' : 'Save Nominee')}
              </button>
              <p className="text-[10px] mt-1" style={{ color: '#475569' }}>
                {lang === 'hi' ? 'यह केवल UI-स्तर पर सेव होता है। ऑन-चेन अपडेट के लिए कॉन्ट्रैक्ट अपग्रेड आवश्यक है।' : 'Saved at UI level only. On-chain update requires contract upgrade.'}
              </p>
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

// ── Village 3D Banner ──────────────────────────────────────────────────────────
function VillageBanner({ lang, onNftClick, onRoyaltyClick, onEmergencyClick, onBaithakClick, onGiftClick, freeChaiPool }: { lang: Lang; onNftClick: () => void; onRoyaltyClick: () => void; onEmergencyClick: () => void; onBaithakClick: () => void; onGiftClick: () => void; freeChaiPool: number }) {
  const s = strings[lang]
  return (
    <div className="relative mb-4 rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg,#7c2d12 0%,#9a3412 15%,#b45309 32%,#92400e 50%,#78350f 68%,#6b2d0f 82%,#431407 100%)',
      boxShadow: '0 12px 40px rgba(120,53,15,0.5), inset 0 1px 0 rgba(251,191,36,0.2)', minHeight: 148,
    }}>
      {/* Kalamkari-inspired SVG texture overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.08 }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="kalam" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="8" fill="none" stroke="#fbbf24" strokeWidth="0.8"/>
            <path d="M20 12 C24 16 24 24 20 28 C16 24 16 16 20 12Z" fill="none" stroke="#fbbf24" strokeWidth="0.6"/>
            <circle cx="20" cy="20" r="2" fill="#fbbf24"/>
            <path d="M12 20 Q16 16 20 20 Q24 16 28 20" fill="none" stroke="#fbbf24" strokeWidth="0.5"/>
            <path d="M12 20 Q16 24 20 20 Q24 24 28 20" fill="none" stroke="#fbbf24" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#kalam)"/>
      </svg>
      {/* Marigold garland */}
      <div className="absolute top-0 left-0 right-0 flex justify-center py-1 gap-0.5 flex-wrap z-10">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} style={{ fontSize: 10, opacity: 0.95 }}>{i % 3 === 0 ? '🌸' : '🌼'}</span>
        ))}
      </div>
      {/* Village scene */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-4 pb-1">
        <span style={{ fontSize: 28 }} title="Chai Stall">🏡</span>
        <span style={{ fontSize: 24 }} title="Chai">☕</span>
        <span style={{ fontSize: 24 }} title="Samosa">🥟</span>
        <span style={{ fontSize: 28 }} title="Temple">⛩️</span>
        <span style={{ fontSize: 24 }} title="Tree">🌴</span>
      </div>
      {/* Main content */}
      <div className="relative z-10 px-5 pt-7 pb-3 flex flex-col items-center">
        {/* 3D embossed clay-like title */}
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
          <button onClick={onNftClick}
            className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105"
            style={{ background: 'rgba(99,102,241,0.75)', color: '#e9d5ff', border: '1px solid rgba(167,139,250,0.4)' }}>
            🏺 NFT Pass
          </button>
          <button onClick={onRoyaltyClick}
            className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105"
            style={{ background: 'rgba(217,119,6,0.75)', color: '#fef9c3', border: '1px solid rgba(251,191,36,0.4)' }}>
            🔑 Master Key
          </button>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer"
            className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105"
            style={{ background: 'rgba(20,184,166,0.75)', color: '#f0fdfa', border: '1px solid rgba(45,212,191,0.4)', textDecoration: 'none' }}>
            💧 Faucet
          </a>
          <button onClick={onEmergencyClick}
            className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105"
            style={{ background: 'rgba(220,38,38,0.75)', color: '#fee2e2', border: '1px solid rgba(252,165,165,0.4)' }}>
            🚨 Emergency
          </button>
          <button onClick={onBaithakClick}
            className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105"
            style={{ background: 'rgba(5,150,105,0.75)', color: '#d1fae5', border: '1px solid rgba(52,211,153,0.4)' }}>
            🪑 बैठक बुक
          </button>
          <button onClick={onGiftClick}
            className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:scale-105"
            style={{ background: 'rgba(180,83,9,0.75)', color: '#fef3c7', border: '1px solid rgba(251,191,36,0.4)' }}>
            🎁 Gift Chai
          </button>
        </div>
        {/* Cultural floating badges */}
        <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
          {[
            { label: '🐄 गाय का शुद्ध दूध', bg: 'rgba(245,158,11,0.25)', border: 'rgba(251,191,36,0.5)' },
            { label: '🏺 माटी की सुगंध',     bg: 'rgba(180,83,9,0.25)',  border: 'rgba(217,119,6,0.5)'  },
            { label: '🌐 Web3 Settled',       bg: 'rgba(20,184,166,0.2)', border: 'rgba(45,212,191,0.45)'},
          ].map(b => (
            <span key={b.label} className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: b.bg, color: '#fef9c3', border: `1.5px solid ${b.border}` }}>
              {b.label}
            </span>
          ))}
          {/* Free Chai Pool badge */}
          <span className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: 'rgba(34,197,94,0.22)', color: '#d1fae5', border: '1.5px solid rgba(52,211,153,0.5)' }}>
            🏺 {lang === 'hi' ? `मुफ्त चाय: ${freeChaiPool}` : `Free Chais: ${freeChaiPool}`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Emergency Assist Modal ─────────────────────────────────────────────────────
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
            <p className="text-sm" style={{ color: '#c4b5fd' }}>
              {lang === 'hi' ? 'देसी नेटवर्क से जोड़ा जा रहा है…' : 'Connecting to Desi Network…'}
            </p>
            <div className="mt-4 flex justify-center gap-1">
              {[0,1,2,3].map(i => (
                <div key={i} className="rounded-full transition-all" style={{ width: 8, height: 8, background: i <= dot ? '#fbbf24' : 'rgba(251,191,36,0.2)' }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: '#c4b5fd' }}>
              {lang === 'hi' ? 'अपनी ज़रूरत चुनें — सिर्फ 0.10 USDC में तुरंत मदद' : 'Select your need — instant help for just 0.10 USDC'}
            </p>
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

// ── Baithak Booking Modal ──────────────────────────────────────────────────────
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
        <p className="text-xs mb-3" style={{ color: '#6ee7b7' }}>
          {lang === 'hi' ? '0.50 USDC रिफंडेबल डिपॉज़िट — बैठक कन्फर्म करें' : '0.50 USDC refundable deposit — secure your spot'}
        </p>
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

// ── Gift Chai Modal ────────────────────────────────────────────────────────────
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
            <p className="text-xs mb-3" style={{ color: '#fde68a' }}>
              {lang === 'hi' ? 'दोस्त का वॉलेट/हैंडल डालें और गिफ्ट करें' : "Enter friend's wallet/handle and gift instantly"}
            </p>
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

// ── Error Boundary ─────────────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────────
function TipJarInner() {
  const { address, isConnected, chainId } = useAccount()
  const { error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChain } = useSwitchChain()

  // Live native USDC balance (Arc native = 18 decimals)
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

  // Cart-based ordering
  const [cart, setCart] = useState<CartMap>({})
  const [fulfillment, setFulfillment] = useState<Fulfillment>('dine-in')
  const totalStr = cartTotal(cart)
  const hasItems = parseFloat(totalStr) > 0

  // Legacy single amount — derived from cart total (overridden by effectiveTipAmount after coupon)
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
  const [_nftClaimed, _setNftClaimed] = useState(false)
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)

  const [merchantSearch, setMerchantSearch] = useState('')
  const [welcomeShown, setWelcomeShown] = useState(false)
  const [freeChaiPool, setFreeChaiPool] = useState(0)
  const [claimingFreeChai, setClaimingFreeChai] = useState(false)

  // Per-wallet private order history — session only
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

  // Contract read state
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

  // Hard privacy lock + Brave cache purge on disconnect
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

  // Brave accountsChanged → force disconnect
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    type EP = { on: (e: string, cb: (a: string[]) => void) => void; removeListener: (e: string, cb: (a: string[]) => void) => void }
    const provider = window.ethereum as EP
    const handler = (accounts: string[]) => { if (accounts.length === 0) { purgeWagmiCache(); disconnect() } }
    try { provider.on('accountsChanged', handler) } catch { /* ignore */ }
    return () => { try { provider.removeListener('accountsChanged', handler) } catch { /* ignore */ } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isWrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID
  const isBusy = step === 'tipping' || step === 'pending-tip'

  // Receipt hook
  const { data: receiptData, status: receiptStatus } = useWaitForTransactionReceipt({
    hash: pendingHash ?? undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!pendingHash && step === 'pending-tip' },
  })

  const refetchAll = useCallback(() => { setReadSeq((n) => n + 1); void refetchBalance() }, [refetchBalance])
  const refetchAllRef = useRef(refetchAll)
  useEffect(() => { refetchAllRef.current = refetchAll }, [refetchAll])

  // Final message
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

  // Receipt confirmation
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

  // Brave 12s fallback
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

  // Decoupled contract reads
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
      } catch { /* silent */ }
    }
    void read()
    const timer = setInterval(() => { void read() }, 3_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [readSeq])

  // Live balance from wagmi useBalance (replaces manual polling)
  useEffect(() => {
    if (!isConnected || !balanceData) { setUserBalanceDisplay(null); return }
    setUserBalanceDisplay(parseFloat(formatEther(balanceData.value)).toFixed(2))
  }, [isConnected, balanceData])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleLangToggle = (next: Lang) => {
    setLangState(next); saveLang(next)
    if (!muted && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(strings[next].langSwitchConfirm)
        utt.lang = next === 'hi' ? 'hi-IN' : 'en-IN'
        window.speechSynthesis.speak(utt)
      } catch { /* ignore */ }
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
      } catch { /* ignore */ }
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
        } catch { /* user rejected */ }
      } else { try { void switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { /* ignore */ } }
    }
  }

  const handleCopyOwner = async () => {
    if (!ownerAddress) return
    try { await navigator.clipboard.writeText(ownerAddress); setCopied(true); speak(s.copied); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
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
      try { const bal = await publicClient.getBalance({ address }); setUserBalanceDisplay(parseFloat(formatEther(bal)).toFixed(2)) } catch { /* ignore */ }
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
      })
    } catch (e: unknown) {
      setStep('idle')
      const msg = parseOnchainError(e, langRef.current)
      toast.error(msg); speak(msg); return
    }
    setPendingHash(txHash); setStep('pending-tip')
  }

  // Welcome toast — fires once on first load
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

  // ── Derived ────────────────────────────────────────────────────────────────────
  const formattedTotal = totalCollected != null ? formatNativeUsdc(totalCollected) : '0.00'
  const displayTotal = isConnected ? formattedTotal : '0.00'
  const displayTipCount = isConnected && tipsCount != null ? Number(tipsCount) : 0
  const isLowBalance = userBalanceDisplay != null && parseFloat(userBalanceDisplay) < LOW_BALANCE_THRESHOLD
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const _effectiveTipAmount = couponDiscount > 0
    ? Math.max(0, parseFloat(totalStr) * (1 - couponDiscount)).toFixed(2)
    : totalStr

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <>
      {showQr && <QrScanner onResult={handleQrResult} onClose={() => setShowQr(false)} cancelLabel={s.scanQrCancel} />}
      {showNftPass && <KulhadNftModal lang={lang} onClose={() => setShowNftPass(false)} />}
      {showRoyaltyConsole && <RoyaltyConsole lang={lang} onClose={() => setShowRoyaltyConsole(false)} displayTotal={displayTotal} displayTipCount={displayTipCount} connectedAddress={address} />}
      {showRegisterMerchant && <RegisterMerchantModal lang={lang} onClose={() => setShowRegisterMerchant(false)} onRegister={handleRegisterMerchant} />}
      {showEmergency && <EmergencyAssistModal lang={lang} onClose={() => setShowEmergency(false)} onPay={(type) => { toast.success(lang === 'hi' ? `🚨 ${type} अलर्ट भेजा गया!` : `🚨 ${type} alert sent!`); setShowEmergency(false) }} />}
      {showBaithak && <BaithakBookingModal lang={lang} onClose={() => setShowBaithak(false)} onBook={(slot, seat) => { toast.success(lang === 'hi' ? `🪑 ${seat} ${slot} के लिए बुक हो गई!` : `🪑 ${seat} booked for ${slot}!`) }} />}
      {showGiftChai && <GiftChaiModal lang={lang} onClose={() => setShowGiftChai(false)} onGift={(to, item) => { toast.success(lang === 'hi' ? `🎁 ${item} गिफ्ट ${to.slice(0,8)}… को भेजी!` : `🎁 ${item} gifted to ${to.slice(0,8)}…!`) }} />}
      {qrMerchant && <MerchantQrModal merchant={qrMerchant} onClose={() => setQrMerchant(null)} closeLabel={s.merchantQrClose} title={s.merchantQrTitle} />}

      <div className="relative min-h-dvh overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
        {/* Ambient blobs — terracotta warm glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:'absolute',top:'3%',left:'1%',width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(180,83,9,0.28) 0%,transparent 70%)',filter:'blur(90px)' }} />
          <div style={{ position:'absolute',top:'8%',right:'4%',width:340,height:340,borderRadius:'50%',background:'radial-gradient(circle,rgba(251,191,36,0.16) 0%,transparent 70%)',filter:'blur(80px)' }} />
          <div style={{ position:'absolute',top:'30%',right:'2%',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(220,38,38,0.12) 0%,transparent 70%)',filter:'blur(72px)' }} />
          <div style={{ position:'absolute',top:'45%',left:'0%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(146,64,14,0.20) 0%,transparent 70%)',filter:'blur(70px)' }} />
          <div style={{ position:'absolute',bottom:'12%',left:'6%',width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(180,83,9,0.18) 0%,transparent 70%)',filter:'blur(75px)' }} />
          <div style={{ position:'absolute',bottom:'5%',right:'3%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,0.14) 0%,transparent 70%)',filter:'blur(65px)' }} />
        </div>
        {/* Village morning SVG artwork overlay — top right, semi-transparent */}
        <div className="fixed top-0 right-0 pointer-events-none opacity-[0.07] overflow-hidden" style={{ width: 420, height: 320, zIndex: 1 }}>
          <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Village huts */}
            <polygon points="30,200 80,140 130,200" fill="#d97706" />
            <rect x="52" y="170" width="22" height="30" fill="#92400e" />
            <polygon points="120,200 180,130 240,200" fill="#b45309" />
            <rect x="144" y="168" width="24" height="32" fill="#78350f" />
            <polygon points="230,200 300,125 370,200" fill="#d97706" />
            <rect x="256" y="164" width="28" height="36" fill="#92400e" />
            {/* Ground */}
            <rect x="0" y="200" width="420" height="12" fill="#78350f" opacity="0.6" />
            {/* Chulha / mud stove */}
            <ellipse cx="60" cy="240" rx="28" ry="10" fill="#92400e" />
            <rect x="42" y="218" width="36" height="22" rx="4" fill="#78350f" />
            <rect x="50" y="210" width="20" height="10" rx="2" fill="#451a03" />
            {/* Steam from chulha */}
            <path d="M58 208 Q55 195 60 185 Q65 175 60 165" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M65 205 Q70 192 66 180 Q62 168 68 158" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            {/* Clay kulhads */}
            <path d="M160 240 Q155 255 165 258 Q175 255 170 240 Z" fill="#b45309" />
            <ellipse cx="165" cy="240" rx="10" ry="4" fill="#d97706" />
            <path d="M190 238 Q185 253 195 256 Q205 253 200 238 Z" fill="#92400e" />
            <ellipse cx="195" cy="238" rx="10" ry="4" fill="#b45309" />
            {/* Cow */}
            <ellipse cx="320" cy="232" rx="40" ry="20" fill="#fde68a" opacity="0.7" />
            <circle cx="360" cy="220" r="14" fill="#fde68a" opacity="0.7" />
            <rect x="305" y="250" width="8" height="18" rx="3" fill="#d97706" opacity="0.7" />
            <rect x="320" y="252" width="8" height="16" rx="3" fill="#d97706" opacity="0.7" />
            <rect x="338" y="252" width="8" height="16" rx="3" fill="#d97706" opacity="0.7" />
            <rect x="352" y="250" width="8" height="18" rx="3" fill="#d97706" opacity="0.7" />
            {/* Milk pail */}
            <path d="M368 235 Q375 235 376 250 Q377 260 366 260 Q355 260 356 250 Q357 235 364 235 Z" fill="#e5e7eb" opacity="0.6" />
            {/* Sun / morning light */}
            <circle cx="390" cy="40" r="30" fill="#fbbf24" opacity="0.4" />
            <circle cx="390" cy="40" r="20" fill="#fcd34d" opacity="0.3" />
            {/* Sun rays */}
            {[0,45,90,135,180,225,270,315].map((deg, i) => (
              <line key={i}
                x1={390 + Math.cos(deg*Math.PI/180)*24}
                y1={40 + Math.sin(deg*Math.PI/180)*24}
                x2={390 + Math.cos(deg*Math.PI/180)*38}
                y2={40 + Math.sin(deg*Math.PI/180)*38}
                stroke="#fcd34d" strokeWidth="2" opacity="0.5" />
            ))}
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-5 pb-12 pt-4">

          {/* ── Grand Chai Stall Signboard ── */}
          <VillageBanner lang={lang} onNftClick={() => setShowNftPass(true)} onRoyaltyClick={() => setShowRoyaltyConsole(true)} onEmergencyClick={() => setShowEmergency(true)} onBaithakClick={() => setShowBaithak(true)} onGiftClick={() => setShowGiftChai(true)} freeChaiPool={freeChaiPool} />

          <div className="rounded-2xl mb-3 overflow-hidden relative" style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 15%, #b45309 35%, #d97706 55%, #ea580c 70%, #9a3412 85%, #7c2d12 100%)',
            boxShadow: '0 12px 48px rgba(153,27,27,0.50), 0 0 0 3px rgba(251,191,36,0.65), 0 0 0 6px rgba(180,83,9,0.25)',
          }}>
            {/* Marigold garland top strip */}
            <div className="flex items-center justify-center gap-0 py-1 px-4 overflow-hidden" style={{ background:'rgba(0,0,0,0.22)' }}>
              {'🌸🌼🌸🌼🌸🌼🌸🌼🌸🌼🌸🌼🌸🌼🌸🌼'.split('').map((c, i) => (
                <span key={i} className="text-xs leading-none">{c}</span>
              ))}
            </div>

            {/* Main signboard content — two-column: title left, status widget right */}
            <div className="px-4 py-2.5">
              {/* Two-column: left = title+slogans, right = status widget */}
              <div className="flex items-start justify-between gap-4">

                {/* LEFT: title + subtitle + badges */}
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-3xl sm:text-4xl drop-shadow-lg flex-shrink-0">☕</span>
                  <div className="min-w-0">
                    <p className="display font-black leading-tight select-none" style={{
                      color: '#fef3c7',
                      fontSize: 'clamp(1.5rem,4.5vw,2.2rem)',
                      textShadow: '0 1px 0 #fff8dc, 0 2px 0 #f59e0b, 0 3px 0 #d97706, 0 4px 0 #b45309, 0 5px 0 #92400e, 0 6px 8px rgba(0,0,0,0.6), 0 0 24px rgba(251,191,36,0.5)',
                      letterSpacing: '-0.01em',
                    }}>
                      {lang === 'hi' ? 'चाय का चंदा' : 'Chai Ka Chanda'}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold leading-tight mt-1" style={{ color:'rgba(254,243,199,0.90)' }}>
                      {lang === 'hi' ? 'असली देसी स्मार्ट स्टॉल • स्टेशन चौक के पास' : 'Authentic Desi Smart Stall · Near Station Chowk'}
                    </p>
                    <p className="text-[11px] sm:text-xs italic mt-1" style={{ color:'rgba(254,243,199,0.70)' }}>
                      {lang === 'hi' ? '"मुस्कुराइए, आप स्मार्ट चाय स्टॉल पर हैं!" ☕' : '"Chai First, Everything Else Later" ☕'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(lang === 'hi'
                        ? ['🔥 कटिंग चाय', '🥟 समोसा', '🏺 कुल्हड़']
                        : ['🔥 Cutting Chai', '🥟 Samosa', '🏺 Kulhad']
                      ).map((badge) => (
                        <span key={badge} className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background:'rgba(255,255,255,0.15)', color:'#fde68a', border:'1px solid rgba(251,191,36,0.45)' }}>
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: status widget + total */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  {/* Total collected */}
                  <div className="text-right rounded-xl px-3 py-1.5" style={{ background:'rgba(0,0,0,0.25)', border:'1px solid rgba(251,191,36,0.3)' }}>
                    <p className="tabular-nums font-black leading-none flex items-center gap-1.5" style={{ color:'#fef3c7', fontSize:'clamp(1.15rem,4vw,1.6rem)' }}>
                      {displayTotal} <UsdcIcon size={15} /><span className="text-sm font-semibold opacity-75">USDC</span>
                    </p>
                    <p className="text-[10px] sm:text-xs font-semibold mt-0.5" style={{ color:'rgba(254,243,199,0.65)' }}>{s.totalCollected}</p>
                  </div>
                  {/* Live status badges */}
                  <div className="flex flex-col gap-1">
                    {[
                      { bg:'rgba(16,185,129,0.22)', border:'rgba(16,185,129,0.5)', text: lang === 'hi' ? 'Arc Testnet Active 🟢' : 'Arc Testnet Active 🟢', color:'#6ee7b7' },
                      { bg:'rgba(234,179,8,0.2)',   border:'rgba(234,179,8,0.5)',   text: lang === 'hi' ? 'USDC Settlement ⚡' : 'USDC Settlement ⚡',   color:'#fde68a' },
                      { bg:'rgba(139,92,246,0.22)', border:'rgba(139,92,246,0.5)', text: lang === 'hi' ? 'Contract Secured 🔒' : 'Contract Secured 🔒', color:'#c4b5fd' },
                    ].map(({ bg, border, text, color }) => (
                      <div key={text} className="rounded-full px-2 py-0.5 text-right" style={{ background: bg, border: `1px solid ${border}` }}>
                        <span className="text-[9px] font-bold" style={{ color }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom spectrum strip */}
            <div className="h-1" style={{ background:'linear-gradient(90deg,#06b6d4,#6366f1,#ec4899,#f59e0b,#10b981,#06b6d4)' }} />
          </div>

          {/* ── Top header bar ── */}
          <header className="mb-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Coffee size={18} style={{ color:'var(--accent)',flexShrink:0 }} />
              <span className="display text-sm font-bold" style={{ color:'var(--ink)' }}>{s.appName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <div className="flex rounded-xl overflow-hidden text-xs font-bold" style={{ border:'1px solid var(--border)' }}>
                {(['hi','en'] as Lang[]).map((l) => (
                  <button key={l} onClick={() => handleLangToggle(l)} aria-pressed={lang === l}
                    className="px-3 py-1.5 transition-all"
                    style={lang === l ? { background:'var(--accent)',color:'#fff' } : { background:'var(--surface-muted)',color:'var(--muted)' }}>
                    {l === 'hi' ? 'हि' : 'EN'}
                  </button>
                ))}
              </div>
              <button onClick={handleMuteToggle} aria-label={muted ? s.unmuteLabel : s.muteLabel}
                className="rounded-xl p-2 transition-all"
                style={{ background:'var(--surface-muted)',color:muted ? 'var(--subtle)' : 'var(--ink-2)' }}>
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" title={s.faucetBtn}
                className="rounded-xl p-2 transition-all"
                style={{ background:'rgba(95,190,255,0.12)',color:'var(--accent)',textDecoration:'none' }}>
                <Droplets size={15} />
              </a>
              {/* X / Twitter creator signature */}
              <a href="https://x.com/Bhupendrxsingh" target="_blank" rel="noopener noreferrer" title="Creator @Bhupendrxsingh"
                className="rounded-xl p-2 transition-all"
                style={{ background:'rgba(0,0,0,0.12)', color:'var(--ink-2)', textDecoration:'none', display:'flex', alignItems:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.848L1.254 2.25H8.08l4.258 5.63 5.907-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              {/* Admin console — silent on-chain wallet gate */}
              <button
                onClick={() => {
                  if (!isConnected) { toast(lang === 'hi' ? '🔒 वॉलेट कनेक्ट करें' : '🔒 Connect wallet first'); return }
                  if (!address || address.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
                    toast(lang === 'hi' ? '🔒 ओनर वॉलेट आवश्यक है' : '🔒 Owner Wallet Required')
                    return
                  }
                  setShowRoyaltyConsole(true)
                }}
                title={lang === 'hi' ? 'ओनर पैनल' : 'Owner Panel'}
                className="rounded-xl p-2 transition-all"
                style={{ background:'rgba(0,0,0,0.10)', color:'var(--subtle)', opacity: 0.45 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
              </button>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>
          </header>

          {/* Banners */}
          {isWrongChain && (
            <div className="rounded-xl px-4 py-3 mb-3 flex items-center gap-3" style={{ background:'rgba(186,43,76,0.08)',border:'1px solid rgba(186,43,76,0.20)' }}>
              <AlertCircle size={15} style={{ color:'var(--danger)',flexShrink:0 }} />
              <p className="text-xs flex-1" style={{ color:'var(--danger)' }}>{s.wrongChain}</p>
              <button onClick={() => { void handleSwitchToArc() }} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background:'var(--danger)',color:'#fff' }}>{s.switchNetwork}</button>
            </div>
          )}
          {showConnectError && connectError && !isConnected && (
            <div className="rounded-xl px-4 py-3 mb-3 flex items-start gap-3" style={{ background:'rgba(186,43,76,0.08)',border:'1px solid rgba(186,43,76,0.20)' }}>
              <AlertCircle size={15} style={{ color:'var(--danger)',flexShrink:0,marginTop:2 }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={{ color:'var(--danger)' }}>{s.errConnectFailed}</p>
                <p className="text-xs mt-0.5 break-words" style={{ color:'var(--danger)',opacity:0.8 }}>{connectError.message ?? String(connectError)}</p>
              </div>
              <button onClick={() => setShowConnectError(false)} className="flex-shrink-0 text-xs ml-auto" style={{ color:'var(--subtle)' }}>✕</button>
            </div>
          )}

          {/* ── STOREFRONT (always visible) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

              {/* ── LEFT COLUMN: Stats + Merchant + Orders (order-2 on mobile, order-1 on lg) ── */}
              <div className="space-y-4 order-2 lg:order-1">

                {/* Today's Special combo card */}
                <div className="rounded-2xl p-4 overflow-hidden relative" style={{ background:'linear-gradient(135deg,#fef3c7,#fde68a,#fbbf24)', border:'2px solid rgba(251,191,36,0.5)', boxShadow:'0 4px 20px rgba(251,191,36,0.25)' }}>
                  <p className="text-sm font-black uppercase tracking-widest mb-2" style={{ color:'#92400e' }}>{lang === 'hi' ? '⭐ आज का स्पेशल' : "⭐ Today's Special"}</p>
                  <p className="text-lg font-black mb-1" style={{ color:'#78350f' }}>🍵🥟 {lang === 'hi' ? 'कटिंग चाय + 2 समोसे' : 'Cutting Chai + 2 Samosas'}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-black" style={{ color:'#b45309' }}>1.00 USDC</span>
                    <span className="text-xs line-through" style={{ color:'#d97706' }}>1.25 USDC</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'#dc2626', color:'#fff' }}>SAVE 20%</span>
                  </div>
                  <p className="text-xs" style={{ color:'#92400e' }}>{lang === 'hi' ? '🌸 ताज़ी इलायची चाय हर घंटे तैयार' : '🌸 Fresh elaichi chai brewed every hour'}</p>
                </div>

                {/* Chai Philosophy rotating quotes */}
                <ChaiPhilosophyCard lang={lang} />

                {/* Retro FM Radio */}
                <FmRadioWidget lang={lang} />

                {/* Web3 trust badges */}
                <div className="rounded-2xl p-4 space-y-2" style={{ background:'linear-gradient(135deg,rgba(251,191,36,0.10),rgba(234,88,12,0.07))', border:'1px solid rgba(251,191,36,0.28)' }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color:'#92400e' }}>{lang === 'hi' ? '🔐 Web3 भरोसा' : '🔐 Web3 Trust'}</p>
                  {[
                    { icon:'⚡', text: lang === 'hi' ? 'Arc Testnet — USDC माइक्रो-पेमेंट' : 'Arc Testnet — Micro-settlements in USDC' },
                    { icon:'🏷️', text: lang === 'hi' ? 'प्रोग्रामेबल कॉम्बो सेटलमेंट' : 'Programmable Combo Settlement' },
                    { icon:'📜', text: lang === 'hi' ? 'लाइव ऑन-चेन रसीद' : 'Live On-Chain Receipts' },
                    { icon:'🛡️', text: lang === 'hi' ? 'ओपन-सोर्स स्मार्ट कॉन्ट्रैक्ट' : 'Open-Source Smart Contract' },
                  ].map(({ icon, text }) => (
                    <div key={icon} className="flex items-start gap-2">
                      <span className="text-sm leading-none flex-shrink-0 mt-0.5">{icon}</span>
                      <p className="text-xs font-semibold" style={{ color:'#92400e' }}>{text}</p>
                    </div>
                  ))}
                </div>

                {/* Stats card */}
                <div className="rounded-2xl p-5" style={glass.card}>
                  <div style={{ height:3,borderRadius:99,background:spectral,marginBottom:16 }} />
                  <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color:'var(--subtle)' }}>{s.totalCollected}</p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="display text-5xl font-black tabular-nums" style={{ color:'var(--ink)' }}>{displayTotal}</span>
                    <UsdcIcon size={24} />
                    <span className="display text-2xl font-bold mb-0.5" style={{ color:'var(--muted)' }}>USDC</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Users size={13} style={{ color:'var(--subtle)' }} />
                      <span className="text-xs tabular-nums" style={{ color:'var(--muted)' }}>{displayTipCount} {s.supporters}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={13} style={{ color:'var(--subtle)' }} />
                      <span className="text-xs" style={{ color:'var(--muted)' }}>{s.network}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop:'1px solid rgba(0,0,0,0.06)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color:'var(--subtle)' }}>{lang === 'hi' ? 'चाय का चंदा' : 'Chai Ka Chanda'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color:'var(--subtle)' }}>{s.tipsGoTo}</span>
                      <span className="mono text-xs font-semibold" style={{ color:'var(--ink-2)' }}>{ownerAddress ? formatAddress(ownerAddress) : formatAddress(TIPJAR.address)}</span>
                      <button onClick={() => void handleCopyOwner()} title={s.copied} className="ml-auto p-1 rounded-lg" style={{ background:'var(--surface-muted)',color:copied ? 'var(--success)' : 'var(--subtle)' }}>
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Balance strip */}
                {(userBalanceDisplay || isWrongChain) && (
                  <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={glass.inner}>
                    <TokenUSDC variant="branded" size={15} />
                    <span className="text-sm tabular-nums font-semibold" style={{ color:isWrongChain ? 'var(--danger)' : 'var(--ink)' }}>
                      {s.yourBalance}: {isWrongChain ? (lang === 'hi' ? 'गलत नेटवर्क' : 'Wrong Network') : `${userBalanceDisplay} USDC`}
                    </span>
                  </div>
                )}

                {/* Faucet nudge */}
                {isLowBalance && !isWrongChain && (
                  <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background:'rgba(95,190,255,0.08)',border:'1px solid rgba(95,190,255,0.2)' }}>
                    <Droplets size={13} style={{ color:'var(--accent)',flexShrink:0 }} />
                    <p className="text-xs flex-1" style={{ color:'var(--accent)' }}>{s.faucetLowBalance}</p>
                    <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background:'var(--accent)',color:'#fff',textDecoration:'none' }}>{s.faucetBtn}</a>
                  </div>
                )}

                {/* Merchant directory */}
                <div className="rounded-2xl overflow-hidden" style={glass.card}>
                  <button onClick={() => setShowMerchants((v) => !v)} className="w-full flex items-center gap-3 px-5 py-4 text-left" style={{ background:'transparent' }}>
                    <Store size={15} style={{ color:'var(--accent)',flexShrink:0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color:'var(--ink)' }}>{s.merchantTitle}</p>
                      <p className="text-xs" style={{ color:'var(--muted)' }}>{s.merchantSubtitle}</p>
                    </div>
                    {showMerchants ? <ChevronUp size={15} style={{ color:'var(--subtle)' }} /> : <ChevronDown size={15} style={{ color:'var(--subtle)' }} />}
                  </button>
                  {showMerchants && (
                    <div className="px-4 pb-4 space-y-2">
                      {/* Search + Register */}
                      <div className="flex gap-2 mb-2">
                        <input value={merchantSearch} onChange={e => setMerchantSearch(e.target.value)}
                          placeholder={lang === 'hi' ? '🔍 खोजें…' : '🔍 Search…'}
                          className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                          style={{ background:'var(--surface-muted)', border:'1px solid rgba(148,163,184,0.2)', color:'var(--ink)' }} />
                        <button onClick={() => setShowRegisterMerchant(true)}
                          className="rounded-xl px-3 py-2 text-xs font-bold flex-shrink-0"
                          style={{ background:'var(--accent)', color:'#fff' }}>
                          {s.registerMerchantTitle}
                        </button>
                      </div>
                      {merchants.filter(m => !merchantSearch || m.name.toLowerCase().includes(merchantSearch.toLowerCase()) || m.handle.toLowerCase().includes(merchantSearch.toLowerCase())).map((m) => (
                        <div key={m.address} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={glass.inner}>
                          <span className="text-lg flex-shrink-0">{m.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color:'var(--ink)' }}>{m.name}</p>
                            <p className="mono text-xs" style={{ color:'var(--subtle)' }}>{m.handle} · {formatAddress(m.address)}</p>
                          </div>
                          <button onClick={() => setQrMerchant(m)} title={s.merchantQrTitle} className="p-1.5 rounded-lg flex-shrink-0" style={{ background:'var(--surface-muted)',color:'var(--subtle)' }}><QrCode size={12} /></button>
                          <button onClick={() => handleMerchantSelect(m)} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background:'var(--accent)',color:'#fff' }}>{s.merchantSelectBtn}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Claim Free Chai — Pay-it-Forward */}
                <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,rgba(6,78,59,0.7),rgba(5,150,105,0.4))', border: '1.5px solid rgba(52,211,153,0.4)', boxShadow: '0 4px 16px rgba(5,150,105,0.15)' }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#6ee7b7' }}>
                    {lang === 'hi' ? '🏺 एक और कप — Pay-it-Forward' : '🏺 Ek Aur Cup — Pay-it-Forward'}
                  </p>
                  <p className="text-xs mb-3" style={{ color: 'rgba(167,243,208,0.75)' }}>
                    {lang === 'hi'
                      ? `${freeChaiPool} मुफ्त चाय उपलब्ध — किसी ने आपके लिए दी है!`
                      : `${freeChaiPool} free chai${freeChaiPool !== 1 ? 's' : ''} available — someone paid it forward!`}
                  </p>
                  <button
                    disabled={claimingFreeChai || freeChaiPool === 0}
                    onClick={() => void (async () => {
                      if (freeChaiPool === 0) { toast.error(lang === 'hi' ? '☕ अभी कोई मुफ्त चाय नहीं है!' : '☕ No free chais in the pool right now!'); return }
                      if (!isConnected) { toast(lang === 'hi' ? '🔗 पहले वॉलेट कनेक्ट करें' : '🔗 Connect your wallet first'); return }
                      setClaimingFreeChai(true)
                      await new Promise(r => setTimeout(r, 1500))
                      setFreeChaiPool(p => Math.max(0, p - 1))
                      setClaimingFreeChai(false)
                      toast.success(lang === 'hi' ? '🎉 मुफ्त चाय क्लेम हो गई! चाय का मज़ा लें ☕' : '🎉 Free chai claimed! Enjoy your cup ☕')
                    })()}
                    className="w-full rounded-xl py-2.5 text-sm font-bold transition-all"
                    style={{
                      background: freeChaiPool === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(52,211,153,0.25)',
                      color: freeChaiPool === 0 ? 'rgba(167,243,208,0.4)' : '#34d399',
                      border: `1.5px solid ${freeChaiPool === 0 ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.5)'}`,
                      cursor: freeChaiPool === 0 ? 'not-allowed' : 'pointer',
                    }}>
                    {claimingFreeChai ? (lang === 'hi' ? '⏳ क्लेम हो रहा है...' : '⏳ Claiming...') : (lang === 'hi' ? '🎁 मुफ्त चाय क्लेम करें' : '🎁 Claim a Free Chai')}
                  </button>
                </div>

                {/* My Orders */}
                {myOrders.length > 0 && (
                  <div className="rounded-2xl p-5" style={glass.card}>
                    <p className="display text-sm font-bold mb-3" style={{ color:'var(--ink)' }}>{s.myOrdersTitle}</p>
                    <div className="space-y-2">
                      {myOrders.map((order) => {
                        const secsAgo = Math.floor((Date.now() - order.timestamp) / 1000)
                        const timeLabel = secsAgo < 60 ? (lang === 'hi' ? 'अभी-अभी' : 'just now') : secsAgo < 3600 ? (lang === 'hi' ? `${Math.floor(secsAgo/60)} मिनट पहले` : `${Math.floor(secsAgo/60)}m ago`) : (lang === 'hi' ? `${Math.floor(secsAgo/3600)} घंटे पहले` : `${Math.floor(secsAgo/3600)}h ago`)
                        return (
                          <div key={order.txHash} className="rounded-xl px-3 py-2.5" style={glass.inner}>
                            <div className="flex items-center justify-between gap-2">
                              <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, order.txHash)} target="_blank" rel="noopener noreferrer" className="mono text-xs inline-flex items-center gap-1 hover:underline" style={{ color:'var(--accent-hover)' }}>
                                {formatAddress(order.txHash)} <ExternalLink size={10} />
                              </a>
                              <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color:'var(--accent)' }}>{order.amount} USDC</span>
                            </div>
                            {order.cartLine && <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>{order.cartLine}</p>}
                            <p className="text-xs mt-0.5" style={{ color:'var(--subtle)' }}>{timeLabel}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── CENTER COLUMN: Menu + Form (order-1 on mobile = first) ── */}
              <div className="space-y-4 order-1 lg:order-2">

                {/* Fulfillment selector */}
                <div className="rounded-2xl p-4" style={glass.card}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:'var(--subtle)' }}>{s.fulfillmentTitle}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([['delivery', <Bike key="b" size={15} />, s.fulfillmentDelivery], ['dine-in', <UtensilsCrossed key="u" size={15} />, s.fulfillmentDineIn]] as [Fulfillment, React.ReactNode, string][]).map(([val, icon, label]) => (
                      <button key={val} onClick={() => { setFulfillment(val); speak(label) }}
                        className="rounded-xl p-3 flex items-center gap-2 text-sm font-semibold transition-all"
                        style={fulfillment === val
                          ? { background:'var(--accent)',color:'#fff',boxShadow:'0 4px 12px rgba(99,102,241,0.3)' }
                          : { background:'var(--surface-muted)',color:'var(--ink)' }}>
                        {icon}<span className="text-left leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step cards */}
                {step === 'timed-out' && (
                  <div className="rounded-2xl p-5" style={glass.card}>
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle size={20} style={{ color:'var(--danger)',flexShrink:0,marginTop:2 }} />
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color:'var(--ink)' }}>{s.txTimeout}</p>
                        {(tipHash ?? pendingHash) && (
                          <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, (tipHash ?? pendingHash)!)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs" style={{ color:'var(--accent-hover)' }}>
                            <span className="mono">{formatAddress((tipHash ?? pendingHash)!)}</span><ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { speak(s.tryAgain); handleReset() }} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background:'var(--surface-muted)',color:'var(--ink-2)' }}>{s.tryAgain}</button>
                  </div>
                )}

                {step === 'done' && lastOrder && (
                  <OrderReceiptCard order={lastOrder} lang={lang} onNewOrder={handleReset} />
                )}

                {step === 'done' && !lastOrder && (
                  <div className="rounded-2xl p-5 text-center" style={glass.card}>
                    <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color:'var(--success)' }} />
                    <p className="display text-lg font-bold mb-1" style={{ color:'var(--ink)' }}>{s.thankyouTitle}</p>
                    <p className="text-sm mb-3" style={{ color:'var(--muted)' }}>{s.thankyouBody}</p>
                    <button onClick={handleReset} className="w-full rounded-xl py-3 text-sm font-semibold mt-2" style={{ background:'var(--surface-muted)',color:'var(--ink-2)' }}>{s.sendAnother}</button>
                  </div>
                )}

                {step === 'summary' && (
                  <div className="rounded-2xl p-5" style={glass.card}>
                    <p className="display text-base font-bold mb-4" style={{ color:'var(--ink)' }}>{s.summaryTitle}</p>
                    {summaryLoading ? (
                      <div className="flex justify-center py-6"><span className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color:'var(--accent)' }} /></div>
                    ) : (
                      <>
                        {([
                          [s.summaryYouSend(tipAmount || '0'), null],
                          [s.summaryFee, feeEstimate != null ? `${feeEstimate} USDC` : s.summaryFeeValue],
                          [s.summaryTo, ownerAddress ? formatAddress(ownerAddress) : formatAddress(TIPJAR.address)],
                          [s.receiptFulfillment, fulfillment === 'delivery' ? s.fulfillmentDelivery : s.fulfillmentDineIn],
                        ] as [string, string | null][]).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                            <span className="text-sm" style={{ color:'var(--muted)' }}>{label}</span>
                            {value && <span className="text-sm font-semibold mono" style={{ color:'var(--ink)' }}>{value}</span>}
                          </div>
                        ))}
                        <div className="rounded-xl px-3 py-2.5 mt-3" style={{ background:'rgba(95,190,255,0.08)',border:'1px solid rgba(95,190,255,0.2)' }}>
                          <p className="text-xs" style={{ color:'var(--accent)' }}>{s.singleStepNote}</p>
                        </div>
                        {userBalanceDisplay && <p className="text-xs mt-2 tabular-nums" style={{ color:'var(--subtle)' }}>{s.yourBalance}: {userBalanceDisplay} USDC</p>}
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => setStep('idle')} className="flex-1 rounded-xl py-3 text-sm font-semibold" style={{ background:'var(--surface-muted)',color:'var(--ink-2)' }}>←</button>
                          <button onClick={() => { speak(s.proceedBtn(tipAmount || '0')); void handleTip() }}
                            className="flex-[3] rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ background:'var(--accent)',color:'#fff' }}>
                            <Heart size={15} />{s.proceedBtn(tipAmount || '0')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Menu + form (idle / busy) */}
                {(step === 'idle' || isBusy) && (
                  <div className="rounded-2xl p-5 overflow-hidden" style={{ background:'linear-gradient(160deg,#1c1917,#292524)', border:'2px solid rgba(251,191,36,0.35)', boxShadow:'0 8px 32px rgba(0,0,0,0.35)' }}>
                    {/* Railway board header */}
                    <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom:'1px dashed rgba(251,191,36,0.3)' }}>
                      <span className="text-2xl">🚂</span>
                      <p className="display text-lg sm:text-xl font-black tracking-wider" style={{ color:'#fef3c7', textShadow:'0 0 12px rgba(251,191,36,0.4)' }}>{lang === 'hi' ? 'प्लेटफ़ॉर्म मेनू — भाव सूची' : 'PLATFORM MENU — PRICE LIST'}</p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'rgba(251,191,36,0.70)' }}>{lang === 'hi' ? 'इंडियन रेलवेज़ • चाय का चंदा स्टॉल' : 'Indian Railways • Chai Ka Chanda Stall'}</p>
                    <div className="space-y-2 mb-3">
                      {MENU_ITEMS.map((item) => {
                        const label = getMenuLabel(item.key, s)
                        const qty = cart[item.key] ?? 0
                        return (
                          <div key={item.key} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                            style={qty > 0
                              ? { background: item.selectedBg, border:`1.5px solid ${item.color}60` }
                              : { background:'rgba(255,255,255,0.04)', border:`1px solid ${item.color}22` }}>
                            <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-base sm:text-lg font-bold leading-tight" style={{ color:'#fef3c7' }}>{label}</p>
                                {item.badge && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full leading-none" style={{ background: BADGE_STYLES[item.badge].bg, color: BADGE_STYLES[item.badge].color }}>
                                    {BADGE_STYLES[item.badge].label[lang]}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm tabular-nums font-extrabold" style={{ color: item.color }}>{item.price}</p>
                              {item.splitTag && <span className="text-[10px] font-semibold" style={{ color:'#a78bfa' }}>⚡ {s.menuSplitTag}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => adjustCart(item.key, -1)} disabled={qty === 0}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                style={{ background:qty === 0 ? 'rgba(0,0,0,0.04)' : 'var(--surface-muted)',color:qty === 0 ? 'var(--subtle)' : 'var(--ink-2)' }}>
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center text-sm font-bold tabular-nums" style={{ color:'var(--ink)' }}>{qty}</span>
                              <button onClick={() => adjustCart(item.key, 1)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                style={{ background:'var(--accent)',color:'#fff' }}>
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Quick amount pills */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'rgba(254,243,199,0.55)' }}>{lang === 'hi' ? '⚡ त्वरित राशि' : '⚡ Quick Amount'}</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { amt:'0.25', key:'chai'      as const, bg:'rgba(20,184,166,0.18)',  color:'#14b8a6', border:'rgba(20,184,166,0.5)'  },
                          { amt:'0.50', key:'kulhadChai'as const, bg:'rgba(234,179,8,0.18)',   color:'#d97706', border:'rgba(234,179,8,0.5)'   },
                          { amt:'1.00', key:'combo'     as const, bg:'rgba(220,38,38,0.16)',   color:'#ef4444', border:'rgba(220,38,38,0.45)'  },
                          { amt:'2.00', key:'kulhad'    as const, bg:'rgba(139,92,246,0.18)',  color:'#8b5cf6', border:'rgba(139,92,246,0.5)'  },
                        ]).map(({ amt, key, bg, color, border }) => {
                          return (
                            <button key={amt} type="button"
                              onClick={() => { adjustCart(key, 1); speak(`${amt} USDC`) }}
                              className="rounded-full px-3 py-1 text-xs font-bold transition-all"
                              style={{ background: bg, color, border:`1.5px solid ${border}` }}>
                              +{amt} <UsdcIcon size={11} /> USDC
                            </button>
                          )
                        })}
                        {/* Ek Aur Cup — Pay-it-Forward */}
                        <button type="button"
                          onClick={() => {
                            adjustCart('kulhadChai', 1)
                            setFreeChaiPool(p => p + 1)
                            speak(lang === 'hi' ? 'एक और कप' : 'Ek Aur Cup')
                            toast.success(lang === 'hi' ? '🏺 एक और कप — किसी के लिए मुफ्त चाय जोड़ी गई!' : '🏺 Ek Aur Cup — a free chai added to the pool!')
                          }}
                          className="rounded-full px-3 py-1 text-xs font-bold transition-all"
                          style={{ background: 'rgba(34,197,94,0.18)', color: '#22c55e', border: '1.5px solid rgba(34,197,94,0.5)' }}>
                          🏺 {lang === 'hi' ? 'एक और कप +0.50' : 'Ek Aur Cup +0.50'}
                        </button>
                      </div>
                    </div>

                    {/* Field 1: Name */}
                    <div className="rounded-xl px-3 py-2.5 mb-2" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color:'rgba(254,243,199,0.55)' }}>{s.yourName} <span style={{ fontWeight:400,textTransform:'none',letterSpacing:0 }}>{s.nameOptional}</span></label>
                        <span className="text-xs tabular-nums" style={{ color:'rgba(254,243,199,0.4)' }}>{name.length}/30</span>
                      </div>
                      <input type="text" maxLength={30} placeholder={s.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-sm outline-none" style={{ color:'#fef3c7' }} />
                    </div>

                    {/* Field 2: Wallet address + QR */}
                    <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color:'rgba(254,243,199,0.55)' }}>{s.walletAddrLabel}</label>
                        <span className="text-xs tabular-nums" style={{ color:'rgba(254,243,199,0.4)' }}>{walletAddr.length}/42</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="text" maxLength={42} placeholder={s.walletAddrPlaceholder} value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)} className="flex-1 bg-transparent text-sm outline-none mono" style={{ color:'#fef3c7' }} />
                        {qrSupported && (
                          <button type="button" onClick={() => { speak(s.scanQr); setShowQr(true) }} title={s.scanQr} className="flex-shrink-0 p-1.5 rounded-lg" style={{ background:'rgba(255,255,255,0.08)',color:'#fbbf24' }}>
                            <QrCode size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vibe tags */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:'rgba(254,243,199,0.55)' }}>{s.vibeLabel}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.vibeTags.map((tag, i) => {
                          const isSel = vibeTag === tag
                          return (
                            <button key={tag} type="button" onClick={() => { setVibeTag(isSel ? null : tag); speak(tag) }}
                              className="rounded-full px-2.5 py-1 text-xs font-semibold transition-all"
                              style={isSel ? { background:VIBE_COLORS[i],color:VIBE_TEXT_COLORS[i],border:`1.5px solid ${VIBE_TEXT_COLORS[i]}` } : { background:'rgba(255,255,255,0.08)',color:'rgba(254,243,199,0.6)',border:'1.5px solid transparent' }}>
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Coupon box */}
                    <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background:'rgba(255,255,255,0.06)', border:'1.5px dashed rgba(251,191,36,0.4)' }}>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color:'rgba(254,243,199,0.6)' }}>
                        🎟️ {s.couponLabel}
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon() }}
                          placeholder={s.couponPlaceholder} maxLength={12}
                          className="flex-1 bg-transparent text-sm outline-none mono font-bold uppercase"
                          style={{ color: couponApplied ? '#4ade80' : '#fbbf24' }} />
                        <button type="button" onClick={handleApplyCoupon} disabled={couponApplied}
                          className="rounded-lg px-3 py-1 text-xs font-bold flex-shrink-0"
                          style={{ background: couponApplied ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)', color: couponApplied ? '#4ade80' : '#fbbf24', border:`1px solid ${couponApplied ? 'rgba(34,197,94,0.4)' : 'rgba(251,191,36,0.4)'}` }}>
                          {couponApplied ? '✓' : s.couponApply}
                        </button>
                      </div>
                      {couponApplied && couponDiscount > 0 && (
                        <p className="text-xs mt-1" style={{ color:'#4ade80' }}>{s.couponSuccess(Math.round(couponDiscount * 100))}</p>
                      )}
                    </div>

                    {/* Message */}
                    <div className="rounded-xl px-3 py-2.5 mb-4" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color:'rgba(254,243,199,0.55)' }}>{s.message}</label>
                        <span className="text-xs tabular-nums" style={{ color:message.length > 72 ? 'var(--danger)' : 'rgba(254,243,199,0.4)' }}>{message.length}/80</span>
                      </div>
                      <textarea maxLength={80} rows={2} placeholder={s.messagePlaceholder} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-transparent text-sm outline-none resize-none" style={{ color:'#fef3c7' }} />
                    </div>

                    {/* In-flight status */}
                    {isBusy && (
                      <div className="mb-3 space-y-1.5">
                        <p className="text-xs text-center" style={{ color:'var(--muted)' }}>{step === 'tipping' ? s.sendingTip : s.txPendingTip}</p>
                        {pendingHash && (
                          <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, pendingHash)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs" style={{ color:'var(--accent-hover)' }}>
                            <span className="mono">{formatAddress(pendingHash)}</span><ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    {!isConnected ? (
                      <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                          <button onClick={openConnectModal}
                            className="w-full rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                            style={{ background:'var(--accent)',color:'#fff' }}>
                            <Heart size={15} />{lang === 'hi' ? '💳 वॉलेट जोड़ें — पेमेंट करें' : '💳 Connect Wallet — Pay with USDC'}
                          </button>
                        )}
                      </ConnectButton.Custom>
                    ) : isWrongChain ? (
                      <button onClick={() => { void handleSwitchToArc() }} className="w-full rounded-xl py-3.5 text-sm font-bold" style={{ background:'var(--danger)',color:'#fff' }}>{s.switchNetwork}</button>
                    ) : isBusy ? (
                      <button disabled className="w-full rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2" style={{ background:'rgba(18,45,69,0.5)',color:'#fff',cursor:'not-allowed' }}>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{s.sendingTip}
                      </button>
                    ) : (
                      <button onClick={() => { speak(s.sendTip(tipAmount || '0')); void handleOpenSummary() }}
                        className="w-full rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                        style={{ background:'var(--accent)',color:'#fff' }}>
                        <Heart size={15} />{s.sendTip(tipAmount || '0')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN: Cart Summary (Bus-Ticket Style, order-3 always) ── */}
              <div className="space-y-4 order-3 lg:order-3">
                <div className="rounded-2xl p-5 lg:sticky lg:top-4 overflow-hidden" style={{ background:'#fffbf0', border:'3px solid #dc2626', boxShadow:'4px 4px 0 #b45309, 0 8px 32px rgba(220,38,38,0.15)' }}>
                  {/* Ticket top strip */}
                  <div className="flex items-center justify-between mb-1 pb-2" style={{ borderBottom:'2px dashed #dc2626' }}>
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={17} style={{ color:'#dc2626',flexShrink:0 }} />
                      <p className="display text-base font-black tracking-wide" style={{ color:'#7f1d1d' }}>{lang === 'hi' ? '🎫 ऑर्डर टिकट' : '🎫 ORDER TICKET'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase" style={{ color:'#dc2626' }}>USDC PAY</span>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color:'rgba(127,29,29,0.5)' }}>{lang === 'hi' ? 'चाय का चंदा • स्मार्ट स्टॉल' : 'CHAI KA CHANDA • SMART STALL'}</p>
                  {!hasItems ? (
                    <div className="text-center py-6">
                      <p className="text-sm" style={{ color:'var(--muted)' }}>{s.cartEmpty}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {MENU_ITEMS.filter((i) => (cart[i.key] ?? 0) > 0).map((item) => {
                          const qty = cart[item.key] ?? 0
                          const lineTotal = (qty * parseFloat(item.amount)).toFixed(2)
                          return (
                            <div key={item.key} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                              <div className="flex items-center gap-2">
                                <span>{item.emoji}</span>
                                <div>
                                  <p className="text-xs font-semibold" style={{ color:'var(--ink)' }}>{getMenuLabel(item.key, s)}</p>
                                  <p className="text-xs tabular-nums" style={{ color:'var(--subtle)' }}>{qty} × {item.price}</p>
                                </div>
                              </div>
                              <span className="text-sm font-bold tabular-nums" style={{ color:'var(--accent)' }}>{lineTotal}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background:'rgba(220,38,38,0.08)', border:'1.5px dashed #dc2626' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black" style={{ color:'#7f1d1d' }}>{s.cartTotal}</span>
                          <div className="flex items-center gap-1">
                            <TokenUSDC variant="branded" size={15} />
                            <span className="text-lg font-black tabular-nums flex items-center gap-1" style={{ color:'#dc2626' }}>{totalStr} <UsdcIcon size={16} /> USDC</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl px-3 py-2 mb-3" style={{ background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.06)' }}>
                        <div className="flex items-center gap-1.5">
                          {fulfillment === 'delivery' ? <Bike size={13} style={{ color:'var(--muted)' }} /> : <UtensilsCrossed size={13} style={{ color:'var(--muted)' }} />}
                          <span className="text-xs" style={{ color:'var(--muted)' }}>{fulfillment === 'delivery' ? s.fulfillmentDelivery : s.fulfillmentDineIn}</span>
                        </div>
                      </div>
                      {step !== 'summary' && step !== 'done' && (
                        !isConnected ? (
                          <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                              <button onClick={openConnectModal}
                                className="w-full rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                                style={{ background:'var(--accent)',color:'#fff' }}>
                                <Heart size={15} />{lang === 'hi' ? '💳 जोड़ें और पेमेंट करें' : '💳 Connect & Pay with USDC'}
                              </button>
                            )}
                          </ConnectButton.Custom>
                        ) : (
                          <button
                            onClick={() => { speak(s.cartPlaceOrder); void handleOpenSummary() }}
                            disabled={isBusy || isWrongChain}
                            className="w-full rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                            style={isBusy || isWrongChain ? { background:'rgba(18,45,69,0.3)',color:'rgba(255,255,255,0.6)',cursor:'not-allowed' } : { background:'var(--accent)',color:'#fff' }}>
                            <Heart size={15} />{s.cartPlaceOrder} — {totalStr} USDC
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>

                {/* Side poster */}
                <div className="rounded-2xl p-5 hidden lg:block" style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08))',border:'1px solid rgba(245,158,11,0.25)' }}>
                  <p className="text-sm font-bold mb-2" style={{ color:'#92400e' }}>{lang === 'hi' ? "✨ आज का स्पेशल" : "✨ Today's Special"}</p>
                  <p className="text-xs mb-1" style={{ color:'#78350f' }}>🍵🥟 {lang === 'hi' ? 'कॉम्बो ऑफर — 1.50 USDC' : 'Combo Offer — 1.50 USDC'}</p>
                  <p className="text-xs mb-1" style={{ color:'#78350f' }}>🏺 {lang === 'hi' ? 'कुल्हड़ स्पेशल — 2.50 USDC' : 'Kulhad Special — 2.50 USDC'}</p>
                  <p className="text-xs mt-3 font-semibold" style={{ color:'#92400e' }}>{lang === 'hi' ? '🌸 ताज़ी इलायची चाय हर घंटे' : '🌸 Fresh elaichi chai every hour'}</p>
                </div>
              </div>

            </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6 mb-20 sm:mb-6" style={{ color:'var(--subtle)' }}>
            <a href={`${arcChain.explorerBase}/address/${TIPJAR.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ArrowDownToLine size={11} />{s.contractLink}
            </a>
          </p>
        </div>
      </div>

      {/* ── Mobile sticky bottom cart bar (sm and below only) ── */}
      {hasItems && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden" style={{ background:'#fffbf0', borderTop:'2px solid #dc2626', boxShadow:'0 -4px 24px rgba(220,38,38,0.18)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-base">🧾</span>
              <div className="min-w-0">
                <p className="text-xs font-black truncate" style={{ color:'#7f1d1d' }}>
                  {totalItems} {lang === 'hi' ? 'आइटम' : totalItems === 1 ? 'item' : 'items'}
                </p>
                <p className="text-xs font-semibold tabular-nums" style={{ color:'#dc2626' }}>{totalStr} USDC</p>
              </div>
            </div>
            {isConnected ? (
              isWrongChain ? (
                <button onClick={() => { void handleSwitchToArc() }}
                  className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-black"
                  style={{ background:'#dc2626', color:'#fff' }}>
                  {s.switchNetwork}
                </button>
              ) : (
                <button onClick={() => { void handleOpenSummary() }} disabled={isBusy}
                  className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-black flex items-center gap-1.5"
                  style={{ background:'linear-gradient(135deg,#b45309,#dc2626)', color:'#fff', opacity: isBusy ? 0.6 : 1 }}>
                  <ShoppingCart size={14} />{lang === 'hi' ? 'चेकआउट' : 'Checkout'}
                </button>
              )
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button onClick={openConnectModal}
                    className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-black"
                    style={{ background:'linear-gradient(135deg,#b45309,#dc2626)', color:'#fff' }}>
                    {lang === 'hi' ? '🔗 वॉलेट जोड़ें' : '🔗 Connect'}
                  </button>
                )}
              </ConnectButton.Custom>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function TipJarApp() {
  return <ErrorBoundary><TipJarInner /></ErrorBoundary>
}
