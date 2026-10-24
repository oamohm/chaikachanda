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
  AlertCircle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  QrCode,
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
  Music,
  Home,
  ShieldCheck,
  Globe,
  Briefcase,
  UserCheck,
  Compass,
  Package,
  Award,
  HelpCircle,
} from 'lucide-react'
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

const arcPublicClient = createPublicClient({
  chain: arcViemChain,
  transport: http(ARC_RPC, { retryCount: 5, retryDelay: 2000, timeout: 10_000 }),
})

const NATIVE_DECIMALS = 18
const ERC20_DECIMALS = 6
const SCALE = BigInt(1e12)
const MINIMUM_DISPLAY = 0.1
const FAUCET_URL = 'https://faucet.circle.com'
const LOW_BALANCE_THRESHOLD = 2

function toNative(erc20Amount: bigint): bigint { return erc20Amount * SCALE }
function parseErc20(amount: string): bigint { try { return parseUnits(amount, ERC20_DECIMALS) } catch { return 0n } }
function formatNativeUsdc(raw: bigint): string { return Amount.fromRaw(raw, NATIVE_DECIMALS).toFixed(2) }

// ── Authentic USDC Web3 SVG Icon ───────────────────────────────────────────────
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

// ── Menu ───────────────────────────────────────────────────────────────────────
interface MenuItem {
  key: 'chai' | 'kulhadChai' | 'milk' | 'masalaChai' | 'samosa' | 'kachori' | 'lassi' | 'aloo' | 'combo' | 'kulhad'
  emoji: string
  price: string
  amount: string
  badge?: 'bestseller' | 'hot' | 'organic' | 'offer' | 'new'
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
  { key: 'combo',      emoji: '🍵🥟', price: '1.00 USDC', amount: '1',    badge: 'offer',      color: '#6366f1', selectedBg: 'rgba(99,102,241,0.22)' },
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
  return s.errDefault
}

const glass = {
  card: {
    background: 'rgba(28, 25, 23, 0.88)',
    border: '1.5px solid rgba(251, 191, 36, 0.35)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    color: '#fef3c7',
  } as React.CSSProperties,
}
const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

// ── Policy-Compliant Desi Jukebox (YouTube Official Embed Player & Dropdown) ──
const JUKEBOX_SONGS = [
  { title: 'Chaiyya Chaiyya (Dil Se)', videoId: 'YOpx_pKynSw' },
  { title: 'Ek Garam Chai Ki Pyali Ho', videoId: '6Xm-K8V4QZ0' },
  { title: 'Kajra Re & Chai Vibes', videoId: 'O40748uJsBc' },
  { title: 'Desi Lo-Fi Chai Beats', videoId: '5qap5aO4i9A' },
]

function DesiJukeboxWidget({ lang }: { lang: Lang }) {
  const [selectedId, setSelectedId] = useState(JUKEBOX_SONGS[0].videoId)
  const [playing, setPlaying] = useState(false)

  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', border: '2px solid rgba(99,102,241,0.4)', boxShadow: '0 6px 24px rgba(99,102,241,0.25)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.35)' }}>
          <Music size={20} className="text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-indigo-100">{lang === 'hi' ? '🎵 देसी चाय ज्यूकबॉक्स' : '🎵 Desi Chai Jukebox'}</p>
          <p className="text-xs text-indigo-300/80">{lang === 'hi' ? 'अपनी पसंद का भारतीय चाय गीत चुनें' : 'Select your favorite Indian chai song'}</p>
        </div>
      </div>

      <div className="mb-3">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setPlaying(true) }}
          className="w-full rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-stone-900 border border-indigo-500/40 text-indigo-100 cursor-pointer">
          {JUKEBOX_SONGS.map(song => (
            <option key={song.videoId} value={song.videoId}>{song.title}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-2">
        <button onClick={() => setPlaying(!playing)}
          className="flex-1 rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500">
          <span>{playing ? '⏸' : '▶'}</span>
          {playing ? (lang === 'hi' ? 'प्लेयर रोकें' : 'Pause Player') : (lang === 'hi' ? 'गाना बजाएं' : 'Play Song')}
        </button>
      </div>

      {playing && (
        <div className="mt-3 overflow-hidden rounded-xl" style={{ height: 80 }}>
          <iframe
            width="100%"
            height="80"
            src={`https://www.youtube.com/embed/${selectedId}?autoplay=1`}
            title="Chai Jukebox Player"
            allow="autoplay"
            style={{ border: 0, borderRadius: 12 }}
          />
        </div>
      )}
    </div>
  )
}

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
        <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-bold bg-amber-600 text-white">{closeLabel}</button>
      </div>
    </div>
  )
}

function ChaiPhilosophyCard({ lang }: { lang: Lang }) {
  const quotes = {
    hi: ['"चाय पीओ, दुनिया को समझो।"', '"एक कप चाय में ज़िंदगी के सारे जवाब हैं।"', '"दोस्ती और चाय — दोनों गरम रहें।"'],
    en: ['"Chai is not just a drink, it\'s an emotion."', '"A cup of chai a day keeps worries away."', '"Life happens, chai helps."']
  }
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % quotes[lang].length), 5_000)
    return () => clearInterval(t)
  }, [lang])
  return (
    <div className="rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#7f1d1d 0%,#9f1239 30%,#b45309 65%,#92400e 100%)', border:'1.5px solid rgba(251,191,36,0.4)' }}>
      <p className="text-xs font-black uppercase tracking-widest mb-2 text-amber-200">{lang === 'hi' ? '🍃 चाय दर्शन' : '🍃 Chai Philosophy'}</p>
      <p className="text-base font-bold italic leading-relaxed text-amber-100">{quotes[lang][idx]}</p>
    </div>
  )
}

function RegisterMerchantModal({ onClose, onRegister, lang }: {
  onClose: () => void; onRegister: (m: Merchant) => void; lang: Lang
}) {
  const [rName, setRName] = useState('')
  const [rAddress, setRAddress] = useState('')
  const handleSubmit = () => {
    if (!rName.trim() || !/^0x[0-9a-fA-F]{40}$/.test(rAddress.trim())) return
    onRegister({ name: rName.trim(), handle: `@${rName.trim().toLowerCase().replace(/\s+/g, '_')}`, emoji: '☕', address: rAddress.trim() as `0x${string}`, defaultAmount: '0.5' })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md bg-stone-900 border border-amber-500">
        <p className="font-black text-lg mb-4 text-amber-400">{lang === 'hi' ? '🏪 नया व्यापारी जोड़ें' : '🏪 Register Merchant'}</p>
        <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Name" className="w-full mb-3 rounded-xl px-3 py-2 text-sm bg-stone-800 text-white outline-none" />
        <input value={rAddress} onChange={(e) => setRAddress(e.target.value)} placeholder="0x Wallet Address" className="w-full mb-4 rounded-xl px-3 py-2 text-xs bg-stone-800 text-white outline-none font-mono" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-stone-800 text-white text-sm">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold">Register</button>
        </div>
      </div>
    </div>
  )
}

function KulhadNftModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const s = strings[lang]
  const [claimed, setClaimed] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-3xl p-6 w-full max-w-sm text-center bg-indigo-950 border border-indigo-400">
        <div className="text-5xl mb-2">🏺</div>
        <p className="font-black text-xl mb-1 text-indigo-100">{s.nftPassTitle}</p>
        <p className="text-xs mb-4 text-indigo-300">{s.nftPassSubtitle}</p>
        <button onClick={() => setClaimed(true)} className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white mb-2">
          {claimed ? s.nftPassClaimed : s.nftPassClaim}
        </button>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-indigo-300 text-xs">Close</button>
      </div>
    </div>
  )
}

function RoyaltyConsole({ lang, onClose, royaltyKey, setRoyaltyKey, royaltyUnlocked, royaltyKeyError, onUnlock, displayTotal, displayTipCount }: {
  lang: Lang; onClose: () => void; royaltyKey: string; setRoyaltyKey: (v: string) => void; royaltyUnlocked: boolean; royaltyKeyError: boolean; onUnlock: () => void; displayTotal: string; displayTipCount: number
}) {
  const s = strings[lang]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-3xl p-6 w-full max-w-md bg-slate-900 border border-amber-500">
        <div className="flex justify-between items-center mb-4">
          <p className="font-black text-base text-amber-400">🔑 {s.royaltyTitle}</p>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        {!royaltyUnlocked ? (
          <div>
            <input value={royaltyKey} onChange={e => setRoyaltyKey(e.target.value)} placeholder={s.royaltyKeyPlaceholder} type="password"
              className="w-full rounded-xl px-4 py-3 text-sm text-center font-mono mb-3 bg-stone-800 text-white outline-none border border-stone-700" />
            {royaltyKeyError && <p className="text-xs text-center mb-3 text-red-500 font-bold">{s.royaltyWrongKey}</p>}
            <button onClick={onUnlock} className="w-full rounded-xl py-3 text-sm font-bold bg-amber-600 text-white">{s.royaltyUnlock}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-center font-bold text-green-400">{s.royaltyWelcome}</p>
            <div className="p-4 rounded-xl bg-stone-800 space-y-2">
              <div className="flex justify-between text-xs text-gray-300"><span>Total Collected:</span><span className="font-black text-amber-400">{displayTotal} USDC</span></div>
              <div className="flex justify-between text-xs text-gray-300"><span>Total Orders:</span><span className="font-black text-amber-400">{displayTipCount}</span></div>
            </div>
            <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-white text-xs">Close</button>
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
      boxShadow: '0 12px 40px rgba(120,53,15,0.5)', minHeight: 160,
    }}>
      <div className="absolute top-0 left-0 right-0 flex justify-center py-1 gap-1 flex-wrap z-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ fontSize: 11 }}>{i % 2 === 0 ? '🌸' : '🌼'}</span>
        ))}
      </div>
      <div className="relative z-10 px-6 pt-8 pb-4 flex flex-col items-center">
        <p className="font-black text-3xl sm:text-4xl tracking-wide text-center text-amber-100" style={{ textShadow: '0 2px 0 #431407' }}>
          ☕ चाय का चंदा
        </p>
        <p className="text-xs sm:text-sm text-center mt-1 font-bold text-amber-200">
          {s.appName} • Indian Railways Platform No. 1
        </p>
        <div className="flex gap-2.5 mt-3 flex-wrap justify-center">
          <button onClick={onNftClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold bg-indigo-600 text-indigo-100">🏺 NFT Pass</button>
          <button onClick={onRoyaltyClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold bg-amber-600 text-amber-100">🔑 Master Key</button>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="rounded-full px-3.5 py-1.5 text-xs font-extrabold bg-teal-600 text-teal-100 no-underline">💧 Faucet</a>
          <button onClick={onEmergencyClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold bg-red-600 text-red-100">🚨 Emergency</button>
          <button onClick={onBaithakClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold bg-emerald-600 text-emerald-100">🪑 बैठक बुक</button>
          <button onClick={onGiftClick} className="rounded-full px-3.5 py-1.5 text-xs font-extrabold bg-amber-800 text-amber-100">🎁 Gift Chai</button>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          <button onClick={onSelectMilk} className="rounded-full px-3 py-1 text-xs font-bold cursor-pointer flex items-center gap-1 bg-blue-900/60 text-blue-200 border border-blue-500">
            <Milk size={13} /> 🐄 {lang === 'hi' ? 'गाय का शुद्ध दूध (+0.40 USDC)' : 'Cow Milk (+0.40 USDC)'}
          </button>
          <button onClick={onSelectKulhad} className="rounded-full px-3 py-1 text-xs font-bold cursor-pointer flex items-center gap-1 bg-amber-900/60 text-amber-200 border border-amber-500">
            🏺 {lang === 'hi' ? 'माटी की सुगंध (+2.50 USDC)' : 'Kulhad Special (+2.50 USDC)'}
          </button>
          <span className="rounded-full px-3 py-1 text-xs font-bold bg-teal-900/60 text-teal-200 border border-teal-500">🌐 Web3 Settled</span>
          <span className="rounded-full px-3 py-1 text-xs font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-500">
            🏺 {lang === 'hi' ? `मुफ्त चाय: ${freeChaiPool}` : `Free Chais: ${freeChaiPool}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function EmergencyAssistModal({ lang, onClose, onPay }: { lang: Lang; onClose: () => void; onPay: (type: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm bg-indigo-950 border border-purple-500">
        <p className="font-black text-lg mb-3 text-purple-200">🚨 {lang === 'hi' ? 'इमरजेंसी क्विक मदद' : 'Emergency Quick Assist'}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['Medical', 'Auto Ride', 'Powerbank', 'Water'].map(t => (
            <button key={t} onClick={() => setSelected(t)} className={`p-3 rounded-xl text-xs font-bold border ${selected === t ? 'bg-purple-600 border-purple-300 text-white' : 'bg-stone-900 border-stone-800 text-purple-200'}`}>{t}</button>
          ))}
        </div>
        <button onClick={() => { if (selected) { onPay(selected); onClose() } }} className="w-full py-3 rounded-xl font-bold bg-red-600 text-white text-sm">Send Alert</button>
      </div>
    </div>
  )
}

function BaithakBookingModal({ lang, onClose, onBook }: { lang: Lang; onClose: () => void; onBook: (slot: string, seat: string) => void }) {
  const [slot] = useState('9:00 AM')
  const [seat] = useState('Khat')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm bg-emerald-950 border border-emerald-500">
        <p className="font-black text-lg mb-3 text-emerald-100">🪑 {lang === 'hi' ? 'बैठक रिज़र्व करें' : 'Book a Baithak'}</p>
        <button onClick={() => { onBook(slot, seat); onClose() }} className="w-full py-3 rounded-xl font-bold bg-emerald-600 text-white text-sm">Confirm Booking (0.50 USDC)</button>
      </div>
    </div>
  )
}

function GiftChaiModal({ lang, onClose, onGift }: { lang: Lang; onClose: () => void; onGift: (to: string, item: string) => void }) {
  const [to, setTo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm bg-amber-950 border border-amber-500">
        <p className="font-black text-lg mb-3 text-amber-100">🎁 {lang === 'hi' ? 'दोस्त को चाय गिफ्ट करें' : 'Gift a Chai'}</p>
        <input value={to} onChange={e => setTo(e.target.value)} placeholder="0x... or @handle" className="w-full mb-3 rounded-xl px-3 py-2 text-sm bg-stone-900 text-white outline-none border border-amber-700" />
        <button onClick={() => { if (to) { onGift(to, 'chai'); onClose() } }} className="w-full py-3 rounded-xl font-bold bg-amber-600 text-white text-sm">Send Gift</button>
      </div>
    </div>
  )
}

function TipJarInner() {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
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
  const { muted, toggleMute } = useSpeech(lang)

  const [cart, setCart] = useState<CartMap>({})
  const [fulfillment, setFulfillment] = useState<Fulfillment>('dine-in')
  const totalStr = cartTotal(cart)
  const hasItems = parseFloat(totalStr) > 0
  const tipAmount = totalStr

  const [name, setName] = useState('')
  const [walletAddr, setWalletAddr] = useState('')
  const [message] = useState('')
  const [vibeTag] = useState<string | null>(null)

  const [step, setStep] = useState<'idle' | 'summary' | 'tipping' | 'pending-tip' | 'timed-out' | 'done'>('idle')
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)

  const [showQr, setShowQr] = useState(false)
  const qrSupported = qrScanSupported()
  const [copied, setCopied] = useState(false)
  const [, setUserBalanceDisplay] = useState<string | null>(null)
  const [qrMerchant, setQrMerchant] = useState<Merchant | null>(null)
  const [showRegisterMerchant, setShowRegisterMerchant] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [showBaithak, setShowBaithak] = useState(false)
  const [showGiftChai, setShowGiftChai] = useState(false)
  const [, setMerchants] = useState<Merchant[]>([])
  const [showNftPass, setShowNftPass] = useState(false)
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [royaltyKey, setRoyaltyKey] = useState('')
  const [royaltyUnlocked, setRoyaltyUnlocked] = useState(() => {
    try { return localStorage.getItem('chayChanda_royaltyUnlocked') === 'true' } catch { return false }
  })
  const [royaltyKeyError, setRoyaltyKeyError] = useState(false)
  const [freeChaiPool] = useState(0)

  const [totalCollected, setTotalCollected] = useState<bigint | null>(null)
  const [tipsCount, setTipsCount] = useState<bigint | null>(null)
  const [readSeq, setReadSeq] = useState(0)

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

  useEffect(() => {
    if (step !== 'pending-tip' || !pendingHash) return
    if (receiptStatus === 'success' && receiptData) {
      if (receiptData.status === 'reverted') {
        setStep('idle'); toast.error(s.txFailed)
      } else {
        setStep('done')
        refetchAllRef.current()
        toast.success(s.thankYouSpoken)
      }
    } else if (receiptStatus === 'error') {
      setStep('timed-out'); toast.error(s.txTimeout)
    }
  }, [receiptStatus, receiptData, s])

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

  const handleSwitchToArc = async () => {
    const hexChainId = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`
    if (typeof window === 'undefined' || !window.ethereum) { void switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    try {
      await (window.ethereum as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> })
        .request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
    } catch {
      try { void switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) } catch {}
    }
  }

  const handleCopyOwner = async () => {
    try { await navigator.clipboard.writeText(TIPJAR.address); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const handleQrResult = (value: string) => {
    setShowQr(false)
    const cleaned = value.startsWith('ethereum:') ? value.slice(9).split('@')[0] : value
    setWalletAddr(cleaned.slice(0, 42))
  }

  const adjustCart = (key: MenuItem['key'], delta: number) => {
    setCart((prev) => {
      const cur = prev[key] ?? 0
      const next = Math.max(0, cur + delta)
      const updated = { ...prev, [key]: next }
      if (next === 0) delete updated[key]
      return updated
    })
  }

  const handleTip = async () => {
    if (!walletClient || !address) return
    if (isWrongChain) { void handleSwitchToArc(); return }
    const erc20Units = parseErc20(tipAmount)
    const nativeValue = toNative(erc20Units)
    const rawAddr = walletAddr.trim(); const rawName = name.trim()
    const tipName = rawAddr ? formatAddress(rawAddr) : rawName ? rawName : formatAddress(address)
    setStep('tipping'); setPendingHash(null)
    try {
      const txHash = await walletClient.writeContract({
        address: TIPJAR.address, abi: TIPJAR.abi as Abi, functionName: 'tip',
        args: [tipName, finalMessage.slice(0, 80)], value: nativeValue,
        maxFeePerGas: parseUnits('20', 9),
        maxPriorityFeePerGas: parseUnits('2', 9),
      })
      setPendingHash(txHash); setStep('pending-tip')
    } catch (e: unknown) {
      setStep('idle')
      toast.error(parseOnchainError(e, langRef.current))
    }
  }

  const formattedTotal = totalCollected != null ? formatNativeUsdc(totalCollected) : '0.00'
  const displayTotal = isConnected ? formattedTotal : '0.00'
  const displayTipCount = isConnected && tipsCount != null ? Number(tipsCount) : 0
  const totalItems = Object.values(cart).reduce((a, b) => a + (b || 0), 0)

  return (
    <>
      {showQr && <QrScanner onResult={handleQrResult} onClose={() => setShowQr(false)} cancelLabel={s.scanQrCancel} />}
      {showNftPass && <KulhadNftModal lang={lang} onClose={() => setShowNftPass(false)} />}
      {showRoyaltyConsole && <RoyaltyConsole lang={lang} onClose={() => setShowRoyaltyConsole(false)} royaltyKey={royaltyKey} setRoyaltyKey={setRoyaltyKey} royaltyUnlocked={royaltyUnlocked} royaltyKeyError={royaltyKeyError} onUnlock={() => { if (royaltyKey === 'ARC2026') { setRoyaltyUnlocked(true); localStorage.setItem('chayChanda_royaltyUnlocked', 'true') } else { setRoyaltyKeyError(true) } }} displayTotal={displayTotal} displayTipCount={displayTipCount} />}
      {showRegisterMerchant && <RegisterMerchantModal lang={lang} onClose={() => setShowRegisterMerchant(false)} onRegister={(m) => setMerchants(p => [...p, m])} />}
      {showEmergency && <EmergencyAssistModal lang={lang} onClose={() => setShowEmergency(false)} onPay={(t) => toast.success(`🚨 ${t} alert sent!`)} />}
      {showBaithak && <BaithakBookingModal lang={lang} onClose={() => setShowBaithak(false)} onBook={(sl, se) => toast.success(`🪑 ${se} booked for ${sl}!`)} />}
      {showGiftChai && <GiftChaiModal lang={lang} onClose={() => setShowGiftChai(false)} onGift={(to) => toast.success(`🎁 Gift sent to ${to}!`)} />}
      {qrMerchant && <MerchantQrModal merchant={qrMerchant} onClose={() => setQrMerchant(null)} closeLabel={s.merchantQrClose} title={s.merchantQrTitle} />}

      <div className="relative min-h-dvh overflow-hidden text-amber-50 pb-20 sm:pb-12" style={{ background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)' }}>
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
                  <button key={l} onClick={() => { setLangState(l); saveLang(l) }} className="px-3.5 py-2" style={lang === l ? { background:'#d97706',color:'#fff' } : { background:'rgba(255,255,255,0.05)',color:'#a3a3a3' }}>
                    {l === 'hi' ? 'हिन्दी' : 'English'}
                  </button>
                ))}
              </div>
              <button onClick={toggleMute} className="rounded-xl p-2.5 bg-white/10 text-amber-200">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>
          </header>

          {isWrongChain && (
            <div className="rounded-xl px-5 py-4 mb-4 flex items-center gap-3 bg-red-950/80 border border-red-500">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-sm flex-1 font-bold text-red-200">{s.wrongChain}</p>
              <button onClick={() => void handleSwitchToArc()} className="text-xs font-bold px-4 py-2 rounded-lg bg-red-600 text-white">{s.switchNetwork}</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* Column 1: Jukebox, Philosophy, Stats */}
              <div className="space-y-5 order-2 lg:order-1">
                <ChaiPhilosophyCard lang={lang} />
                <DesiJukeboxWidget lang={lang} />

                <div className="rounded-2xl p-6" style={glass.card}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-amber-400">{s.totalCollected}</p>
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
                      <button onClick={() => void handleCopyOwner()} title={s.copied} className="ml-auto p-1.5 rounded-lg bg-amber-800/50 text-amber-200">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Platform Menu */}
              <div className="space-y-5 order-1 lg:order-2">
                <div className="rounded-2xl p-4 bg-stone-900/90 border border-amber-500/30">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3 text-amber-400">{s.fulfillmentTitle}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([['delivery', <Bike key="b" size={18} />, s.fulfillmentDelivery], ['dine-in', <UtensilsCrossed key="u" size={18} />, s.fulfillmentDineIn]] as [Fulfillment, React.ReactNode, string][]).map(([val, icon, label]) => (
                      <button key={val} onClick={() => setFulfillment(val)} className="rounded-xl p-3.5 flex items-center gap-2.5 text-sm font-bold transition-all" style={fulfillment === val ? { background:'#d97706',color:'#fff' } : { background:'rgba(255,255,255,0.05)',color:'#fef3c7' }}>
                        {icon}<span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-6 overflow-hidden" style={{ background:'linear-gradient(160deg,#1c1917,#292524)', border:'2px solid rgba(251,191,36,0.4)' }}>
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
                        <div key={item.key} className="rounded-xl px-4 py-3 flex items-center gap-4 transition-all" style={qty > 0 ? { background: item.selectedBg, border:`1.5px solid ${item.color}` } : { background:'rgba(255,255,255,0.04)', border:`1px solid rgba(255,255,255,0.08)` }}>
                          <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base font-bold text-amber-100">{label}</p>
                              {item.badge && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: BADGE_STYLES[item.badge].bg, color: BADGE_STYLES[item.badge].color }}>
                                  {BADGE_STYLES[item.badge].label[lang]}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-sm tabular-nums font-black" style={{ color: item.color }}>{item.amount}</span>
                              <UsdcIcon size={14} />
                              <span className="text-xs font-bold text-amber-300">USDC</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0 bg-stone-900/90 p-1.5 rounded-xl border border-amber-500/30">
                            <button onClick={() => adjustCart(item.key, -1)} disabled={qty === 0} className="w-8 h-8 rounded-lg flex items-center justify-center bg-stone-800 text-amber-200 disabled:opacity-30"><Minus size={14} /></button>
                            <span className="w-7 text-center text-base font-black tabular-nums text-amber-300">{qty}</span>
                            <button onClick={() => adjustCart(item.key, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-600 text-white"><Plus size={14} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Column 3: Live Order Receipt Ticket & QR Scanner Widget */}
              <div className="space-y-5 order-3 lg:order-3">
                <div className="rounded-2xl p-6 lg:sticky lg:top-6 overflow-hidden" style={{ background:'#fffbf0', border:'3px solid #dc2626', boxShadow:'6px 6px 0 #b45309' }}>
                  <div className="flex items-center justify-between mb-2 pb-3" style={{ borderBottom:'2px dashed #dc2626' }}>
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={20} style={{ color:'#dc2626' }} />
                      <p className="display text-lg font-black tracking-wide" style={{ color:'#7f1d1d' }}>{lang === 'hi' ? '🎫 ऑर्डर टिकट' : '🎫 ORDER TICKET'}</p>
                    </div>
                    <span className="text-xs font-black uppercase flex items-center gap-1" style={{ color:'#dc2626' }}><UsdcIcon size={14} /> USDC PAY</span>
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
                              <span className="text-base font-black tabular-nums flex items-center gap-1" style={{ color:'#dc2626' }}>{lineTotal} <UsdcIcon size={13} /></span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="rounded-xl p-3.5 mb-4 bg-red-100/80 border-2 border-dashed border-red-500 flex items-center justify-between">
                        <span className="text-base font-black" style={{ color:'#7f1d1d' }}>{s.cartTotal}</span>
                        <span className="text-xl font-black tabular-nums text-red-600 flex items-center gap-1">{totalStr} <UsdcIcon size={16} /> USDC</span>
                      </div>

                      <button onClick={() => void handleTip()} disabled={isBusy || isWrongChain} className="w-full rounded-xl py-4 text-base font-black flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700">
                        <Sparkles size={18} />{s.cartPlaceOrder} — {totalStr} USDC
                      </button>
                    </>
                  )}
                </div>

                {/* Bottom QR Scanner & Wallet Input Widget */}
                <div className="rounded-2xl p-5 bg-stone-900/90 border border-amber-500/30 text-center">
                  <p className="text-sm font-bold text-amber-200 mb-2">{lang === 'hi' ? '📇 क्यूआर कोड या वॉलेट स्कैन करें' : '📇 Scan QR or Wallet'}</p>
                  {qrSupported && (
                    <button onClick={() => setShowQr(true)} className="w-full rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 bg-amber-600 text-white hover:bg-amber-500 mb-3">
                      <QrCode size={16} /> {s.scanQrBtn || 'Scan QR Code'}
                    </button>
                  )}
                  <input value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)} placeholder="Paste 0x... or scan QR" className="w-full rounded-xl px-3 py-2 text-xs bg-stone-950 text-amber-100 border border-amber-500/30 outline-none font-mono" />
                </div>
              </div>

            </div>

          <p className="text-center text-xs mt-8 text-amber-400/60">
            <a href={`${arcChain.explorerBase}/address/${TIPJAR.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ArrowDownToLine size={12} />{s.contractLink}
            </a>
          </p>
        </div>

        {/* 📱 Mobile Sticky Bottom Navigation Bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 border-t border-amber-500/30 px-4 py-2 flex items-center justify-around backdrop-blur-md">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 text-amber-400">
            <Home size={18} />
            <span className="text-[10px] font-bold">{lang === 'hi' ? 'होम' : 'Home'}</span>
          </button>
          <button onClick={() => { const el = document.getElementById('jukebox-section'); el?.scrollIntoView({ behavior: 'smooth' }) }} className="flex flex-col items-center gap-0.5 text-indigo-400">
            <Music size={18} />
            <span className="text-[10px] font-bold">{lang === 'hi' ? 'गाने' : 'Jukebox'}</span>
          </button>
          <button onClick={() => setShowQr(true)} className="flex flex-col items-center gap-0.5 text-amber-400">
            <QrCode size={18} />
            <span className="text-[10px] font-bold">{lang === 'hi' ? 'स्कैन' : 'Scan QR'}</span>
          </button>
          <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 text-red-400 relative">
            <ShoppingCart size={18} />
            {totalItems > 0 && <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">{totalItems}</span>}
            <span className="text-[10px] font-bold">{lang === 'hi' ? 'ऑर्डर' : 'Cart'}</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default function TipJarApp() {
  return <TipJarInner />
}
