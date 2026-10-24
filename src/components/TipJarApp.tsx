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
  Milk,
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

// Public Client with Retry and Timeout
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
  key: 'chai' | 'kulhadChai' | 'milk' | 'masalaChai' | 'samosa' | 'kachori' | 'lassi' | 'aloo' | 'combo' | 'kulhad'
  emoji: string
  price: string
  amount: string
  badge?: 'bestseller' | 'hot' | 'organic' | 'offer' | 'new'
  splitTag?: true
  color: string
  selectedBg: string
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'chai',       emoji: '🍵',   price: '0.25 USDC', amount: '0.25', badge: 'bestseller', color: '#f59e0b', selectedBg: 'rgba(245,158,11,0.22)' },
  { key: 'kulhadChai', emoji: '🏺',   price: '0.50 USDC', amount: '0.5',  badge: 'hot',        color: '#ef4444', selectedBg: 'rgba(239,68,68,0.20)'   },
  { key: 'milk',       emoji: '🥛',   price: '0.40 USDC', amount: '0.4',  badge: 'organic',    color: '#3b82f6', selectedBg: 'rgba(59,130,246,0.22)'  },
  { key: 'masalaChai', emoji: '🫖',   price: '0.75 USDC', amount: '0.75', badge: 'organic',    color: '#10b981', selectedBg: 'rgba(16,185,129,0.20)'  },
  { key: 'samosa',     emoji: '🥟',   price: '0.50 USDC', amount: '0.5',  badge: 'hot',        color: '#f97316', selectedBg: 'rgba(249,115,22,0.20)'  },
  { key: 'kachori',    emoji: '🫓',   price: '0.60 USDC', amount: '0.6',  badge: 'new',        color: '#8b5cf6', selectedBg: 'rgba(139,92,246,0.20)'  },
  { key: 'lassi',      emoji: '🥛',   price: '0.80 USDC', amount: '0.8',  badge: 'organic',    color: '#14b8a6', selectedBg: 'rgba(20,184,166,0.20)'  },
  { key: 'aloo',       emoji: '🫔',   price: '1.25 USDC', amount: '1.25', badge: 'offer',      color: '#ec4899', selectedBg: 'rgba(236,72,153,0.20)'  },
  { key: 'combo',      emoji: '🍵🥟', price: '1.00 USDC', amount: '1',    badge: 'offer', splitTag: true, color: '#6366f1', selectedBg: 'rgba(99,102,241,0.22)' },
  { key: 'kulhad',     emoji: '🏺✨', price: '2.50 USDC', amount: '2.5',  color: '#d97706', selectedBg: 'rgba(217,119,6,0.22)' },
]

const BADGE_STYLES: Record<NonNullable<MenuItem['badge']>, { bg: string; color: string; label: { hi: string; en: string } }> = {
  bestseller: { bg: 'rgba(251,191,36,0.25)', color: '#fbbf24', label: { hi: 'बेस्टसेलर', en: 'Bestseller' } },
  hot:        { bg: 'rgba(239,68,68,0.25)',  color: '#f87171', label: { hi: 'गरमागरम',   en: 'Hot'        } },
  organic:    { bg: 'rgba(34,197,94,0.25)',  color: '#4ade80', label: { hi: 'ऑर्गेनिक',  en: 'Organic'    } },
  offer:      { bg: 'rgba(99,102,241,0.25)', color: '#818cf8', label: { hi: 'ऑफर',       en: 'Offer'      } },
  new:        { bg: 'rgba(168,85,247,0.25)', color: '#c084fc', label: { hi: 'नया',        en: 'New'        } },
}

function getMenuLabel(key: MenuItem['key'], s: typeof strings['en'], lang: Lang): string {
  if (key === 'milk')       return lang === 'hi' ? 'गाय का शुद्ध दूध' : 'Fresh Cow Milk'
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

function cartSummaryLine(cart: CartMap, s: typeof strings['en'], lang: Lang): string {
  return MENU_ITEMS
    .filter((i) => (cart[i.key] ?? 0) > 0)
    .map((i) => `${getMenuLabel(i.key, s, lang)} ×${cart[i.key] ?? 0}`)
    .join(', ')
}

interface Merchant {
  name: string; handle: string; emoji: string
  address: `0x${string}`; defaultAmount: string
}
const MERCHANTS: Merchant[] = [
  { name: 'Ramesh Chaiwala',   handle: '@ramesh_chai',   emoji: '☕', address: TIPJAR.address, defaultAmount: '0.5' },
  { name: 'Sunita Samosawali', handle: '@sunita_samosa', emoji: '🥟', address: TIPJAR.address, defaultAmount: '1'   },
  { name: 'Arun Kulhadwala',   handle: '@arun_kulhad',   emoji: '🏺', address: TIPJAR.address, defaultAmount: '2.5' },
  { name: 'Priya Chai Corner', handle: '@priya_corner',  emoji: '🍵', address: TIPJAR.address, defaultAmount: '1.5' },
]

const VIBE_COLORS = [
  'rgba(245,158,11,0.22)', 'rgba(239,68,68,0.22)',
  'rgba(251,191,36,0.22)', 'rgba(99,102,241,0.22)', 'rgba(168,85,247,0.22)',
]
const VIBE_TEXT_COLORS = ['#fbbf24','#f87171','#fef08a','#818cf8','#c084fc']

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
    background: 'rgba(28, 25, 23, 0.85)',
    border: '1.5px solid rgba(251, 191, 36, 0.35)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    color: '#fef3c7',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    color: '#fef3c7',
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
      void QRCode.toCanvas(canvasRef.current, qrValue, { width: 220, margin: 2, color: { dark: '#122D45', light: '#FFFFFF' } })
    }).catch(() => {})
  }, [qrValue])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-2xl p-6 text-center max-w-sm w-full" style={{ background: '#1c1917', border: '1.5px solid #fbbf24', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <p className="font-bold text-base mb-1" style={{ color: '#fbbf24' }}>{title}</p>
        <p className="text-sm mb-3" style={{ color: '#fef3c7' }}>{merchant.emoji} {merchant.name}</p>
        <div className="flex justify-center mb-4"><canvas ref={canvasRef} style={{ borderRadius: 12 }} /></div>
        <p className="mono text-xs mb-4 break-all p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: '#fde68a' }}>{merchant.address}</p>
        <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-bold" style={{ background: '#d97706', color: '#fff' }}>{closeLabel}</button>
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
    <div className="rounded-2xl p-6 mb-4" style={{ ...glass.card, border: '1.5px solid rgba(34,197,94,0.4)' }}>
      <div style={{ height: 4, borderRadius: 99, background: spectral, marginBottom: 18 }} />
      <div className="flex items-center gap-2 mb-4">
        <Receipt size={22} style={{ color: '#4ade80', flexShrink: 0 }} />
        <p className="display text-lg font-black" style={{ color: '#fef3c7' }}>{s.receiptTitle}</p>
      </div>
      <div className="space-y-3 mb-5">
        <div className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'rgba(254,243,199,0.6)' }}>{s.receiptOrderId}</span>
          <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, order.txHash)} target="_blank" rel="noopener noreferrer"
            className="mono font-bold inline-flex items-center gap-1" style={{ color: '#818cf8' }}>
            {formatAddress(order.txHash)} <ExternalLink size={12} />
          </a>
        </div>
        {order.cartLine && (
          <div className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: 'rgba(254,243,199,0.6)' }}>{s.receiptItems}</span>
            <span className="font-bold text-right max-w-[65%]" style={{ color: '#fef3c7' }}>{order.cartLine}</span>
          </div>
        )}
        <div className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'rgba(254,243,199,0.6)' }}>{s.cartTotal}</span>
          <span className="font-black tabular-nums text-base" style={{ color: '#fbbf24' }}>{order.amount} USDC</span>
        </div>
        <div className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'rgba(254,243,199,0.6)' }}>{s.receiptFulfillment}</span>
          <span className="font-bold" style={{ color: '#fef3c7' }}>
            {order.fulfillment === 'delivery' ? s.fulfillmentDelivery : s.fulfillmentDineIn}
          </span>
        </div>
      </div>
      <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
        {statusLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
              style={i <= statusIdx ? { background: '#22c55e', color: '#fff' } : { background: 'rgba(255,255,255,0.1)', color: '#a3a3a3' }}>
              {i <= statusIdx ? '✓' : i + 1}
            </div>
            <span className="text-sm" style={{ color: i <= statusIdx ? '#fef3c7' : '#a3a3a3', fontWeight: i === statusIdx ? 700 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <button onClick={onNewOrder} className="w-full rounded-xl py-3.5 text-sm font-bold transition-all" style={{ background: 'rgba(255,255,255,0.1)', color: '#fef3c7' }}>
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
    <div className="rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#7f1d1d 0%,#9f1239 30%,#b45309 65%,#92400e 100%)', border:'1.5px solid rgba(251,191,36,0.4)', boxShadow:'0 6px 24px rgba(159,18,57,0.25)' }}>
      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#fde68a' }}>{lang === 'hi' ? '🍃 चाय दर्शन' : '🍃 Chai Philosophy'}</p>
      <p className="text-base font-bold italic leading-relaxed" style={{ color:'#fef3c7' }}>{CHAI_QUOTES[lang][idx]}</p>
      <div className="flex gap-1.5 mt-3">
        {CHAI_QUOTES[lang].map((_, i) => (
          <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === idx ? 24 : 8, background: i === idx ? '#fbbf24' : 'rgba(251,191,36,0.3)' }} />
        ))}
      </div>
    </div>
  )
}

function UsdcIcon({ size = 16 }: { size?: number }) {
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

  const track = LOFI_TRACKS[trackIdx]

  return (
    <div className="rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)', border:'2px solid rgba(99,102,241,0.4)', boxShadow:'0 6px 24px rgba(99,102,241,0.25)' }}>
      <audio ref={audioRef} src={LOFI_TRACKS[trackIdx].src} preload="none" loop />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(99,102,241,0.35)' }}>
          <span className="text-xl">📻</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color:'#c7d2fe' }}>{lang === 'hi' ? 'देसी FM 92.7' : 'Desi FM 92.7'}</p>
          <p className="text-xs" style={{ color:'rgba(199,210,254,0.7)' }}>{lang === 'hi' ? 'लो-फाई चाय बीट्स' : 'Lo-Fi Chai Beats'}</p>
        </div>
        <div className="flex items-end gap-1 h-6 flex-shrink-0">
          {[3,5,4,2,5,3,4].map((h, i) => (
            <div key={i} className="w-1.5 rounded-full transition-all duration-200"
              style={{ height: playing && beat > 0 ? `${(h + (beat + i) % 3) * 3.5}px` : '4px', background: playing ? '#818cf8' : 'rgba(129,140,248,0.3)' }} />
          ))}
        </div>
      </div>
      <div className="rounded-xl px-3 py-2 mb-3 overflow-hidden" style={{ background:'rgba(0,0,0,0.35)' }}>
        <p className="text-xs font-bold truncate" style={{ color:'#e0e7ff' }}>{track.title}</p>
        <p className="text-[11px] truncate" style={{ color:'rgba(224,231,255,0.6)' }}>{track.artist}</p>
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => setPlaying((p) => !p)}
          className="flex-1 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{ background: playing ? 'rgba(99,102,241,0.3)' : '#6366f1', color:'#fff' }}>
          <span>{playing ? '⏸' : '▶'}</span>
          {playing ? (lang === 'hi' ? 'रोकें' : 'Pause') : (lang === 'hi' ? 'चलाएं' : 'Play')}
        </button>
        <button onClick={() => setMuted((m) => !m)}
          className="w-10 rounded-xl flex items-center justify-center text-sm transition-all"
          style={{ background:'rgba(99,102,241,0.25)', color: muted ? '#f87171' : '#a5b4fc' }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color:'rgba(199,210,254,0.6)' }}>🔈</span>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
          onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
          className="flex-1 h-1.5 rounded-full cursor-pointer" style={{ accentColor:'#818cf8' }} />
        <span className="text-xs" style={{ color:'rgba(199,210,254,0.6)' }}>🔉</span>
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
  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(251,191,36,0.3)', color: '#fef3c7' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#1c1917', border: '1.5px solid #fbbf24', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-lg" style={{ color: '#fbbf24' }}>{lang === 'hi' ? '🏪 नया व्यापारी जोड़ें' : '🏪 Register New Merchant'}</p>
          <button onClick={onClose} style={{ color: '#a3a3a3' }}>✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'नाम *' : 'Name *'}</label>
            <input value={rName} onChange={(e) => setRName(e.target.value)} maxLength={30} placeholder={lang === 'hi' ? 'रमेश चाईवाला' : 'Ramesh Chaiwala'} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'हैंडल' : 'Handle'}</label>
              <input value={rHandle} onChange={(e) => setRHandle(e.target.value)} maxLength={20} placeholder="@ramesh_chai" className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'इमोजी' : 'Emoji'}</label>
              <input value={rEmoji} onChange={(e) => setREmoji(e.target.value)} maxLength={2} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'वॉलेट पता *' : 'Wallet Address *'}</label>
            <input value={rAddress} onChange={(e) => setRAddress(e.target.value)} maxLength={42} placeholder="0x..." className="w-full mt-1 rounded-xl px-3 py-2.5 text-xs outline-none mono" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-bold" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'डिफ़ॉल्ट राशि (USDC)' : 'Default Amount (USDC)'}</label>
            <input value={rAmount} onChange={(e) => setRAmount(e.target.value)} type="number" min="0.1" step="0.1" className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          </div>
          {err && <p className="text-xs font-bold" style={{ color: '#ef4444' }}>{err}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: '#fef3c7' }}>{lang === 'hi' ? 'रद्द करें' : 'Cancel'}</button>
          <button onClick={handleSubmit} className="flex-[2] rounded-xl py-3 text-sm font-black" style={{ background: '#d97706', color: '#fff' }}>{lang === 'hi' ? '✅ जोड़ें' : '✅ Register'}</button>
        </div>
      </div>
    </div>
  )
}

function KulhadNftModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const s = strings[lang]
  const [claimed, setClaimed] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-3xl p-6 w-full max-w-sm text-center" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', boxShadow: '0 32px 80px rgba(99,102,241,0.4)', border: '1.5px solid rgba(167,139,250,0.4)' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏺</div>
        <p className="font-black text-xl mb-1" style={{ color: '#f5f3ff' }}>{s.nftPassTitle}</p>
        <p className="text-xs mb-4" style={{ color: '#c4b5fd' }}>{s.nftPassSubtitle}</p>
        <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
          {s.nftPassPerks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <span style={{ color: '#a78bfa', fontSize: 14 }}>✦</span>
              <span className="text-xs font-semibold" style={{ color: '#e9d5ff' }}>{perk}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-3xl p-6 w-full max-w-md" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', border: '1.5px solid rgba(251,191,36,0.4)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-base" style={{ color: '#fbbf24' }}>🔑 {s.royaltyTitle}</p>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>✕</button>
        </div>
        {!royaltyUnlocked ? (
          <div>
            <p className="text-xs mb-3 text-center" style={{ color: '#94a3b8' }}>{s.royaltyLocked}</p>
            <input value={royaltyKey} onChange={e => setRoyaltyKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onUnlock() }}
              placeholder={s.royaltyKeyPlaceholder} type="password"
              className="w-full rounded-xl px-4 py-3 text-sm text-center font-mono mb-3 outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${royaltyKeyError ? '#ef4444' : 'rgba(148,163,184,0.3)'}`, color: '#f1f5f9' }} />
            {royaltyKeyError && <p className="text-xs text-center mb-3 font-bold" style={{ color: '#ef4444' }}>{s.royaltyWrongKey}</p>}
            <button onClick={onUnlock} className="w-full rounded-xl py-3 text-sm font-bold"
              style={{ background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff' }}>{s.royaltyUnlock}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-center mb-1 font-bold" style={{ color: '#4ade80' }}>{s.royaltyWelcome}</p>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Total Collected</span>
                <span className="text-base font-black" style={{ color: '#fbbf24' }}>{displayTotal} USDC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Total Orders</span>
                <span className="text-base font-black" style={{ color: '#fbbf24' }}>{displayTipCount}</span>
              </div>
              <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xs text-gray-400">Target Receiver</span>
                <span className="text-xs mono font-bold" style={{ color: '#a78bfa' }}>{formatAddress(TIPJAR.address)}</span>
              </div>
            </div>
            <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#f1f5f9' }}>
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function VillageBanner({ lang, onNftClick, onRoyaltyClick, onEmergencyClick, onBaithakClick, onGiftClick, freeChaiPool, onSelectMilk, onSelectKulhad }: {
  lang: Lang; onNftClick: () => void; onRoyaltyClick: () => void; onEmergencyClick: () => void; onBaithakClick: () => void; onGiftClick: () => void; freeChaiPool: number; onSelectMilk: () => void; onSelectKulhad: () => void
}) {
  const s = strings[lang]
  return (
    <div className="relative mb-5 rounded-3xl overflow-hidden" style={{
      background: 'linear-gradient(135deg,#7c2d12 0%,#9a3412 15%,#b45309 32%,#92400e 50%,#78350f 68%,#6b2d0f 82%,#431407 100%)',
      boxShadow: '0 12px 40px rgba(120,53,15,0.5), inset 0 1px 0 rgba(251,191,36,0.3)', minHeight: 160,
    }}>
      <div className="absolute top-0 left-0 right-0 flex justify-center py-1 gap-1 flex-wrap z-10">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} style={{ fontSize: 11, opacity: 0.95 }}>{i % 3 === 0 ? '🌸' : '🌼'}</span>
        ))}
      </div>
      <div className="relative z-10 px-6 pt-8 pb-4 flex flex-col items-center">
        <p className="font-black text-3xl sm:text-4xl tracking-wide text-center" style={{
          color: '#fef3c7',
          textShadow: '0 2px 0 #431407, 0 4px 10px rgba(0,0,0,0.6), 0 0 20px rgba(251,191,36,0.4)',
        }}>
          ☕ चाय का चंदा
        </p>
        <p className="text-xs sm:text-sm text-center mt-1 font-bold" style={{ color: '#fed7aa', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {s.appName} • Indian Railways Platform No. 1
        </p>
        <div className="flex gap-2.5 mt-3 flex-wrap justify-center">
          <button onClick={onNftClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all hover:scale-105" style={{ background: 'rgba(99,102,241,0.85)', color: '#e9d5ff', border: '1px solid rgba(167,139,250,0.5)' }}>🏺 NFT Pass</button>
          <button onClick={onRoyaltyClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all hover:scale-105" style={{ background: 'rgba(217,119,6,0.85)', color: '#fef9c3', border: '1px solid rgba(251,191,36,0.5)' }}>🔑 Master Key</button>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all hover:scale-105" style={{ background: 'rgba(20,184,166,0.85)', color: '#f0fdfa', border: '1px solid rgba(45,212,191,0.5)', textDecoration: 'none' }}>💧 Faucet</a>
          <button onClick={onEmergencyClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all hover:scale-105" style={{ background: 'rgba(220,38,38,0.85)', color: '#fee2e2', border: '1px solid rgba(252,165,165,0.5)' }}>🚨 Emergency</button>
          <button onClick={onBaithakClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all hover:scale-105" style={{ background: 'rgba(5,150,105,0.85)', color: '#d1fae5', border: '1px solid rgba(52,211,153,0.5)' }}>🪑 बैठक बुक</button>
          <button onClick={onGiftClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all hover:scale-105" style={{ background: 'rgba(180,83,9,0.85)', color: '#fef3c7', border: '1px solid rgba(251,191,36,0.5)' }}>🎁 Gift Chai</button>
        </div>

        {/* Clickable Active Badges Line */}
        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          <button onClick={onSelectMilk} className="rounded-full px-3 py-1 text-xs font-bold transition-all hover:scale-105 cursor-pointer flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.3)', color: '#bfdbfe', border: '1.5px solid rgba(96,165,250,0.6)' }}>
            <Milk size={13} /> 🐄 {lang === 'hi' ? 'गाय का शुद्ध दूध (+0.40 USDC)' : 'Cow Milk (+0.40 USDC)'}
          </button>
          <button onClick={onSelectKulhad} className="rounded-full px-3 py-1 text-xs font-bold transition-all hover:scale-105 cursor-pointer flex items-center gap-1" style={{ background: 'rgba(180,83,9,0.3)', color: '#fde68a', border: '1.5px solid rgba(251,191,36,0.6)' }}>
            🏺 {lang === 'hi' ? 'माटी की सुगंध (+2.50 USDC)' : 'Kulhad Special (+2.50 USDC)'}
          </button>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'rgba(20,184,166,0.25)', color: '#99f6e4', border: '1.5px solid rgba(45,212,191,0.5)' }}>🌐 Web3 Settled</span>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'rgba(34,197,94,0.25)', color: '#bbf7d0', border: '1.5px solid rgba(52,211,153,0.5)' }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#1e1b4b', border: '2px solid rgba(167,139,250,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
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
            <p className="text-xs mb-4" style={{ color: '#c4b5fd' }}>{lang === 'hi' ? 'अपनी ज़रूरत चुनें — सिर्फ 0.10 USDC में तुरंत मदद' : 'Select your need — instant help for just 0.10 USDC'}</p>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {EMERGENCY_TYPES.map(t => (
                <button key={t.key} onClick={() => setSelected(t.key)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{ background: selected === t.key ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.06)', border: `2px solid ${selected === t.key ? '#a78bfa' : 'rgba(167,139,250,0.2)'}` }}>
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <p className="text-xs font-bold" style={{ color: '#e9d5ff' }}>{lang === 'hi' ? t.hi : t.en}</p>
                </button>
              ))}
            </div>
            <button onClick={handleRequest} disabled={!selected}
              className="w-full rounded-xl py-3.5 font-black text-sm transition-all"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#064e3b', border: '2px solid rgba(52,211,153,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-lg" style={{ color: '#d1fae5' }}>🪑 {lang === 'hi' ? 'बैठक रिज़र्व करें' : 'Book a Baithak'}</p>
          <button onClick={onClose} className="text-emerald-300 hover:text-white text-xl font-bold">✕</button>
        </div>
        <p className="text-xs mb-3" style={{ color: '#6ee7b7' }}>{lang === 'hi' ? '0.50 USDC रिफंडेबल डिपॉज़िट — बैठक कन्फर्म करें' : '0.50 USDC refundable deposit — secure your spot'}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => setSlot(t)}
              className="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
              style={{ background: slot === t ? '#10b981' : 'rgba(255,255,255,0.1)', color: slot === t ? '#fff' : '#6ee7b7' }}>
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {SEATS.map(s => (
            <button key={s.key} onClick={() => setSeat(s.key)}
              className="rounded-xl p-2.5 text-center transition-all"
              style={{ background: seat === s.key ? '#10b981' : 'rgba(255,255,255,0.08)', color: '#d1fae5' }}>
              <div className="text-xl mb-1">{s.emoji}</div>
              <p className="text-xs font-bold">{lang === 'hi' ? s.hi : s.en}</p>
            </button>
          ))}
        </div>
        <button onClick={() => { if (slot && seat) { onBook(slot, seat); onClose() } }}
          disabled={!slot || !seat}
          className="w-full rounded-xl py-3.5 font-black text-sm"
          style={{ background: slot && seat ? '#059669' : 'rgba(255,255,255,0.1)', color: slot && seat ? '#fff' : '#6b7280', cursor: slot && seat ? 'pointer' : 'not-allowed' }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#7c2d12', border: '2px solid #fbbf24', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
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
            <button onClick={onClose} className="rounded-xl px-6 py-2.5 font-bold text-sm mt-2" style={{ background: '#d97706', color: '#fff' }}>
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: '#fde68a' }}>{lang === 'hi' ? 'दोस्त का वॉलेट/हैंडल डालें और गिफ्ट करें' : "Enter friend's wallet/handle and gift instantly"}</p>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder={lang === 'hi' ? '0x... या @handle' : '0x... or @handle'}
              className="w-full rounded-xl px-3.5 py-3 text-sm mb-3 outline-none"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(251,191,36,0.4)', color: '#fef3c7' }} />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {GIFT_OPTIONS.map(o => (
                <button key={o.key} onClick={() => setItem(o.key)}
                  className="rounded-xl p-3 text-center transition-all"
                  style={{ background: item === o.key ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)', border: `2px solid ${item === o.key ? '#fbbf24' : 'rgba(251,191,36,0.3)'}` }}>
                  <div className="text-2xl mb-1">{o.emoji}</div>
                  <p className="text-xs font-bold" style={{ color: '#fef3c7' }}>{lang === 'hi' ? o.hi : o.en}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <UsdcIcon size={12} />
                    <span className="text-xs font-black" style={{ color: '#fbbf24' }}>{o.amount}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleSend} disabled={!to.trim() || !item}
              className="w-full rounded-xl py-3.5 font-black text-sm"
              style={{ background: to.trim() && item ? '#d97706' : 'rgba(255,255,255,0.1)', color: to.trim() && item ? '#fff' : '#6b7280', cursor: to.trim() && item ? 'pointer' : 'not-allowed' }}>
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
        <div className="rounded-2xl p-8 text-center max-w-sm w-full" style={glass.card}>
          <AlertCircle size={40} className="mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p className="font-bold mb-1 text-base" style={{ color: '#fef3c7' }}>{s.errorBoundaryTitle}</p>
          <p className="text-sm mb-4" style={{ color: '#fde68a' }}>{s.errorBoundaryMsg}</p>
          <button onClick={() => window.location.reload()} className="w-full rounded-xl py-3 text-sm font-bold" style={{ background: '#d97706', color: '#fff' }}>{s.errorBoundaryReload}</button>
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
  const [royaltyUnlocked, setRoyaltyUnlocked] = useState(() => {
    try { return localStorage.getItem('chayChanda_royaltyUnlocked') === 'true' } catch { return false }
  })
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

  const finalMessage = (vibeTag ? `${vibeTag} — ` : '') + (message.trim() || cartSummaryLine(cart, s, lang).slice(0, 60))
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
          cartLine: cartSummaryLine(cartRef.current, strings[langRef.current], langRef.current),
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
    try { await navigator.clipboard.writeText(TIPJAR.address); setCopied(true); speak(s.copied); setTimeout(() => setCopied(false), 2000) } catch {}
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
    speak(getMenuLabel(key, s, lang))
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
      try { localStorage.setItem('chayChanda_royaltyUnlocked', 'true') } catch {}
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

      <div className="relative min-h-dvh overflow-hidden text-amber-50" style={{ background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)' }}>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">

          <VillageBanner lang={lang} onNftClick={() => setShowNftPass(true)} onRoyaltyClick={() => setShowRoyaltyConsole(true)} onEmergencyClick={() => setShowEmergency(true)} onBaithakClick={() => setShowBaithak(true)} onGiftClick={() => setShowGiftChai(true)} freeChaiPool={freeChaiPool} onSelectMilk={() => adjustCart('milk', 1)} onSelectKulhad={() => adjustCart('kulhad', 1)} />

          <header className="mb-6 flex items-center justify-between gap-4 flex-wrap p-4 rounded-2xl" style={{ background: 'rgba(28, 25, 23, 0.9)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="flex items-center gap-3">
              <Coffee size={24} className="text-amber-400" />
              <div>
                <span className="display text-lg sm:text-xl font-black text-amber-200">{s.appName}</span>
                <p className="text-xs text-amber-400/80">Platform No. 1 • Arc Testnet</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex rounded-xl overflow-hidden text-xs font-bold border border-amber-500/30">
                {(['hi','en'] as Lang[]).map((l) => (
                  <button key={l} onClick={() => handleLangToggle(l)} aria-pressed={lang === l}
                    className="px-3.5 py-2 transition-all"
                    style={lang === l ? { background:'#d97706',color:'#fff' } : { background:'rgba(255,255,255,0.05)',color:'#a3a3a3' }}>
                    {l === 'hi' ? 'हिन्दी' : 'English'}
                  </button>
                ))}
              </div>
              <button onClick={handleMuteToggle} aria-label={muted ? s.unmuteLabel : s.muteLabel}
                className="rounded-xl p-2.5 transition-all"
                style={{ background:'rgba(255,255,255,0.08)',color:muted ? '#737373' : '#fde68a' }}>
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>
          </header>

          {isWrongChain && (
            <div className="rounded-xl px-5 py-4 mb-4 flex items-center gap-3" style={{ background:'rgba(220,38,38,0.15)',border:'1px solid #ef4444' }}>
              <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-sm flex-1 font-bold text-red-300">{s.wrongChain}</p>
              <button onClick={() => { void handleSwitchToArc() }} className="text-xs font-bold px-4 py-2 rounded-lg bg-red-600 text-white flex-shrink-0">{s.switchNetwork}</button>
            </div>
          )}

          {/* Desktop & Mobile Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* Column 1: Stats, Radio, Merchants */}
              <div className="space-y-5 order-2 lg:order-1">
                <ChaiPhilosophyCard lang={lang} />
                <FmRadioWidget lang={lang} />

                <div className="rounded-2xl p-6" style={glass.card}>
                  <p className="text-xs font-bold tracking-widest uppercase mb-2 text-amber-400">{s.totalCollected}</p>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="display text-5xl font-black tabular-nums text-amber-200">{displayTotal}</span>
                    <UsdcIcon size={28} />
                    <span className="display text-2xl font-bold mb-1 text-amber-400">USDC</span>
                  </div>
                  <div className="flex items-center gap-5 mt-3 pt-3 border-t border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-amber-400" />
                      <span className="text-sm font-semibold tabular-nums text-amber-100">{displayTipCount} {s.supporters}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-amber-400" />
                      <span className="text-sm font-semibold text-amber-100">{s.network}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-500/20">
                    <p className="text-xs font-bold mb-1 text-amber-300">Target Receiver (Permanent)</p>
                    <div className="flex items-center gap-2 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30">
                      <span className="mono text-xs font-bold text-amber-200 truncate">{TIPJAR.address}</span>
                      <button onClick={() => void handleCopyOwner()} title={s.copied} className="ml-auto p-1.5 rounded-lg bg-amber-800/50 text-amber-200 hover:bg-amber-700">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Merchants Panel */}
                <div className="rounded-2xl overflow-hidden" style={glass.card}>
                  <button onClick={() => setShowMerchants((v) => !v)} className="w-full flex items-center gap-3 px-6 py-5 text-left bg-transparent">
                    <Store size={18} className="text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-amber-200">{s.merchantTitle}</p>
                      <p className="text-xs text-amber-400/80">{s.merchantSubtitle}</p>
                    </div>
                    {showMerchants ? <ChevronUp size={18} className="text-amber-400" /> : <ChevronDown size={18} className="text-amber-400" />}
                  </button>
                  {showMerchants && (
                    <div className="px-5 pb-5 space-y-3">
                      <div className="flex gap-2 mb-2">
                        <input value={merchantSearch} onChange={e => setMerchantSearch(e.target.value)}
                          placeholder={lang === 'hi' ? '🔍 खोजें…' : '🔍 Search…'}
                          className="flex-1 rounded-xl px-3.5 py-2.5 text-xs outline-none bg-stone-900 border border-amber-500/30 text-amber-100" />
                        <button onClick={() => setShowRegisterMerchant(true)}
                          className="rounded-xl px-4 py-2.5 text-xs font-bold bg-amber-600 text-white hover:bg-amber-500">
                          {s.registerMerchantTitle}
                        </button>
                      </div>
                      {merchants.filter(m => !merchantSearch || m.name.toLowerCase().includes(merchantSearch.toLowerCase())).map((m) => (
                        <div key={m.address} className="rounded-xl p-3 flex items-center gap-3 bg-stone-900/80 border border-amber-500/20">
                          <span className="text-2xl flex-shrink-0">{m.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-amber-200">{m.name}</p>
                            <p className="mono text-xs text-amber-400/70">{m.handle}</p>
                          </div>
                          <button onClick={() => setQrMerchant(m)} className="p-2 rounded-lg bg-stone-800 text-amber-300"><QrCode size={14} /></button>
                          <button onClick={() => handleMerchantSelect(m)} className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-600 text-white">{s.merchantSelectBtn}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Platform Menu (Interactive & Fixed Contrast) */}
              <div className="space-y-5 order-1 lg:order-2">
                <div className="rounded-2xl p-4 bg-stone-900/90 border border-amber-500/30">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3 text-amber-400">{s.fulfillmentTitle}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([['delivery', <Bike key="b" size={18} />, s.fulfillmentDelivery], ['dine-in', <UtensilsCrossed key="u" size={18} />, s.fulfillmentDineIn]] as [Fulfillment, React.ReactNode, string][]).map(([val, icon, label]) => (
                      <button key={val} onClick={() => { setFulfillment(val); speak(label) }}
                        className="rounded-xl p-3.5 flex items-center gap-2.5 text-sm font-bold transition-all"
                        style={fulfillment === val ? { background:'#d97706',color:'#fff' } : { background:'rgba(255,255,255,0.05)',color:'#fef3c7' }}>
                        {icon}<span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Menu Box */}
                <div className="rounded-2xl p-6 overflow-hidden" style={{ background:'linear-gradient(160deg,#1c1917,#292524)', border:'2px solid rgba(251,191,36,0.4)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
                  <div className="flex items-center gap-3 mb-2 pb-3 border-b border-amber-500/30">
                    <span className="text-3xl">🚂</span>
                    <div>
                      <p className="display text-xl font-black text-amber-200 tracking-wide">{lang === 'hi' ? 'प्लेटफ़ॉर्म मेनू — भाव सूची' : 'PLATFORM MENU — PRICE LIST'}</p>
                      <p className="text-xs font-semibold text-amber-400">{lang === 'hi' ? 'इंडियन रेलवेज़ • चाय का चंदा स्टॉल' : 'Indian Railways • Chai Ka Chanda Stall'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 my-4">
                    {MENU_ITEMS.map((item) => {
                      const label = getMenuLabel(item.key, s, lang)
                      const qty = cart[item.key] ?? 0
                      return (
                        <div key={item.key} className="rounded-xl px-4 py-3 flex items-center gap-4 transition-all"
                          style={qty > 0 ? { background: item.selectedBg, border:`1.5px solid ${item.color}` } : { background:'rgba(255,255,255,0.04)', border:`1px solid rgba(255,255,255,0.08)` }}>
                          <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base sm:text-lg font-bold text-amber-100">{label}</p>
                              {item.badge && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: BADGE_STYLES[item.badge].bg, color: BADGE_STYLES[item.badge].color }}>
                                  {BADGE_STYLES[item.badge].label[lang]}
                                </span>
                              )}
                            </div>
                            <p className="text-sm tabular-nums font-black mt-0.5" style={{ color: item.color }}>{item.price}</p>
                          </div>
                          
                          {/* Plus Minus Buttons with Crisp Contrast */}
                          <div className="flex items-center gap-2 flex-shrink-0 bg-stone-900/90 p-1.5 rounded-xl border border-amber-500/30">
                            <button onClick={() => adjustCart(item.key, -1)} disabled={qty === 0}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-stone-800 text-amber-200 hover:bg-stone-700 disabled:opacity-30">
                              <Minus size={14} />
                            </button>
                            <span className="w-7 text-center text-base font-black tabular-nums text-amber-300">{qty}</span>
                            <button onClick={() => adjustCart(item.key, 1)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-amber-600 text-white hover:bg-amber-500">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Coupon & Details */}
                  <div className="rounded-xl p-3.5 my-4 bg-stone-900/80 border border-amber-500/30">
                    <div className="flex gap-2">
                      <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={s.couponPlaceholder} maxLength={12}
                        className="flex-1 bg-transparent text-sm outline-none mono font-bold uppercase text-amber-300" />
                      <button type="button" onClick={handleApplyCoupon} disabled={couponApplied}
                        className="rounded-lg px-4 py-2 text-xs font-bold bg-amber-600 text-white disabled:bg-stone-700">
                        {couponApplied ? '✓' : s.couponApply}
                      </button>
                    </div>
                  </div>

                  {!isConnected ? (
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <button onClick={openConnectModal}
                          className="w-full rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 bg-amber-600 text-white hover:bg-amber-500">
                          <Heart size={18} />{lang === 'hi' ? '💳 वॉलेट जोड़ें — पेमेंट करें' : '💳 Connect Wallet — Pay with USDC'}
                        </button>
                      )}
                    </ConnectButton.Custom>
                  ) : isWrongChain ? (
                    <button onClick={() => { void handleSwitchToArc() }} className="w-full rounded-xl py-4 text-base font-bold bg-red-600 text-white">{s.switchNetwork}</button>
                  ) : (
                    <button onClick={() => { speak(s.sendTip(tipAmount || '0')); void handleOpenSummary() }}
                      className="w-full rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 bg-amber-600 text-white hover:bg-amber-500">
                      <Heart size={18} />{s.sendTip(tipAmount || '0')}
                    </button>
                  )}
                </div>
              </div>

              {/* Column 3: Live Order Receipt Ticket */}
              <div className="space-y-5 order-3 lg:order-3">
                <div className="rounded-2xl p-6 lg:sticky lg:top-6 overflow-hidden" style={{ background:'#fffbf0', border:'3px solid #dc2626', boxShadow:'6px 6px 0 #b45309, 0 8px 32px rgba(220,38,38,0.2)' }}>
                  <div className="flex items-center justify-between mb-2 pb-3" style={{ borderBottom:'2px dashed #dc2626' }}>
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={20} style={{ color:'#dc2626' }} />
                      <p className="display text-lg font-black tracking-wide" style={{ color:'#7f1d1d' }}>{lang === 'hi' ? '🎫 ऑर्डर टिकट' : '🎫 ORDER TICKET'}</p>
                    </div>
                    <span className="text-xs font-black uppercase" style={{ color:'#dc2626' }}>USDC PAY</span>
                  </div>

                  {!hasItems ? (
                    <div className="text-center py-8">
                      <p className="text-sm font-bold" style={{ color:'#7f1d1d' }}>{s.cartEmpty}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5 my-4">
                        {MENU_ITEMS.filter((i) => (cart[i.key] ?? 0) > 0).map((item) => {
                          const qty = cart[item.key] ?? 0
                          const lineTotal = (qty * parseFloat(item.amount)).toFixed(2)
                          return (
                            <div key={item.key} className="flex items-center justify-between py-2 border-b border-amber-900/10">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{item.emoji}</span>
                                <div>
                                  <p className="text-sm font-bold" style={{ color:'#7f1d1d' }}>{getMenuLabel(item.key, s, lang)}</p>
                                  <p className="text-xs tabular-nums font-semibold" style={{ color:'#b45309' }}>{qty} × {item.price}</p>
                                </div>
                              </div>
                              <span className="text-base font-black tabular-nums" style={{ color:'#dc2626' }}>{lineTotal} USDC</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="rounded-xl p-3.5 mb-4 bg-red-100/80 border-2 border-dashed border-red-500">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black" style={{ color:'#7f1d1d' }}>{s.cartTotal}</span>
                          <span className="text-xl font-black tabular-nums text-red-600">{totalStr} USDC</span>
                        </div>
                      </div>

                      <button
                        onClick={() => { speak(s.cartPlaceOrder); void handleOpenSummary() }}
                        disabled={isBusy || isWrongChain}
                        className="w-full rounded-xl py-4 text-base font-black flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700">
                        <Sparkles size={18} />{s.cartPlaceOrder} — {totalStr} USDC
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>

          <p className="text-center text-xs mt-8 text-amber-400/60">
            <a href={`${arcChain.explorerBase}/address/${TIPJAR.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ArrowDownToLine size={12} />{s.contractLink}
            </a>
          </p>
        </div>
      </div>
    </>
  )
}

export default function TipJarApp() {
  return <ErrorBoundary><TipJarInner /></ErrorBoundary>
}
