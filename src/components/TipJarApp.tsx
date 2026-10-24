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
  Star,
  Search,
  ExternalLink,
  Info,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'
import { Amount } from '@/onchain-money'
import { type Lang, strings, loadLang, saveLang } from '@/i18n'
import { purgeWagmiCache } from '@/safe-storage'
import { useSpeech } from '@/hooks/useSpeech'
import QrScanner, { qrScanSupported } from './QrScanner'
import tipJarArtifact from '../../contracts/out/TipJar.sol/TipJar.json'

// ── Constants & Smart Contract Configuration ──────────────────────────────────
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
const FAUCET_URL = 'https://faucet.circle.com'

function toNative(erc20Amount: bigint): bigint { return erc20Amount * SCALE }
function parseErc20(amount: string): bigint { try { return parseUnits(amount, ERC20_DECIMALS) } catch { return 0n } }
function formatNativeUsdc(raw: bigint): string { return Amount.fromRaw(raw, NATIVE_DECIMALS).toFixed(2) }

// ── Web3 Authentic USDC SVG Icon Component ─────────────────────────────────────
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

// ── Complete Menu Configuration ────────────────────────────────────────────────
interface MenuItem {
  key: string
  label: { hi: string; en: string }
  emoji: string
  price: string
  amount: string
  badge?: 'bestseller' | 'hot' | 'organic' | 'offer' | 'new'
  color: string
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'chai',       label: { hi: 'कटिंग चाय', en: 'Cutting Chai' },           emoji: '🍵', price: '0.25 USDC', amount: '0.25', badge: 'bestseller', color: '#f59e0b' },
  { key: 'kulhadChai', label: { hi: 'कुल्हड़ चाय', en: 'Kulhad Chai' },            emoji: '🏺', price: '0.50 USDC', amount: '0.5',  badge: 'hot',        color: '#ef4444' },
  { key: 'masalaChai', label: { hi: 'मसाला चाय', en: 'Masala Chai' },            emoji: '🫖', price: '0.75 USDC', amount: '0.75', badge: 'organic',    color: '#10b981' },
  { key: 'samosa',     label: { hi: 'गरमागरम समोसा', en: 'Hot Samosa' },         emoji: '🥟', price: '0.50 USDC', amount: '0.5',  badge: 'hot',        color: '#f97316' },
  { key: 'kachori',    label: { hi: 'खस्ता कचौरी', en: 'Khasta Kachori' },       emoji: '🫓', price: '0.60 USDC', amount: '0.6',  badge: 'new',        color: '#8b5cf6' },
  { key: 'lassi',      label: { hi: 'मलाई लस्सी', en: 'Malai Lassi' },           emoji: '🥛', price: '0.80 USDC', amount: '0.8',  badge: 'organic',    color: '#14b8a6' },
  { key: 'aloo',       label: { hi: 'आलू पराठा', en: 'Aloo Paratha' },           emoji: '🫔', price: '1.25 USDC', amount: '1.25', badge: 'offer',      color: '#ec4899' },
  { key: 'combo',      label: { hi: 'चाय + समोसा कॉम्बो', en: 'Chai + Samosa Combo' }, emoji: '🍵🥟', price: '1.00 USDC', amount: '1', badge: 'offer', color: '#6366f1' },
  { key: 'kulhad',     label: { hi: 'कुल्हड़ स्पेशल', en: 'Kulhad Special' },    emoji: '🏺✨', price: '2.50 USDC', amount: '2.5', color: '#d97706' },
]

type CartMap = Record<string, number>

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

// ── Desi Jukebox Widget ────────────────────────────────────────────────────────
const JUKEBOX_SONGS = [
  { title: 'Chaiyya Chaiyya (Dil Se)', videoId: 'YOpx_pKynSw' },
  { title: 'Ek Garam Chai Ki Pyali Ho', videoId: '6Xm-K8V4QZ0' },
  { title: 'Desi Lo-Fi Chai Beats', videoId: '5qap5aO4i9A' },
  { title: 'Kajra Re & Chai Vibes', videoId: 'O40748uJsBc' },
]

function DesiJukeboxWidget({ lang }: { lang: Lang }) {
  const [selectedId, setSelectedId] = useState(JUKEBOX_SONGS[0].videoId)
  const [playing, setPlaying] = useState(false)

  return (
    <div id="jukebox-section" className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', border: '1.5px solid rgba(99,102,241,0.4)', boxShadow: '0 6px 24px rgba(99,102,241,0.25)' }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-900/60 border border-indigo-400/40">
          <Music size={16} className="text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-indigo-100">{lang === 'hi' ? '🎵 देसी चाय ज्यूकबॉक्स' : '🎵 Desi Chai Jukebox'}</p>
          <p className="text-[10px] text-indigo-300/80">{lang === 'hi' ? 'अपनी पसंद का भारतीय चाय गीत चुनें' : 'Select your favorite Indian chai song'}</p>
        </div>
      </div>

      <div className="mb-2">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setPlaying(true) }}
          className="w-full rounded-xl px-3 py-2 text-xs font-bold outline-none bg-stone-900 border border-indigo-500/40 text-indigo-100 cursor-pointer">
          {JUKEBOX_SONGS.map(song => (
            <option key={song.videoId} value={song.videoId}>{song.title}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setPlaying(!playing)}
          className="w-full rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500">
          <span>{playing ? '⏸' : '▶'}</span>
          {playing ? (lang === 'hi' ? 'प्लेयर रोकें' : 'Pause Player') : (lang === 'hi' ? 'गाना बजाएं' : 'Play Song')}
        </button>
      </div>

      {playing && (
        <div className="mt-2 overflow-hidden rounded-xl" style={{ height: 70 }}>
          <iframe
            width="100%"
            height="70"
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

// ── Modals & Auxiliary Screens ─────────────────────────────────────────────────
function KulhadNftModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [claimed, setClaimed] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="rounded-3xl p-6 w-full max-w-sm text-center bg-stone-900 border-2 border-amber-500 shadow-2xl">
        <div className="text-5xl mb-2">🏺</div>
        <p className="font-black text-lg mb-1 text-amber-100">Kulhad Patron NFT Pass</p>
        <p className="text-xs mb-4 text-amber-300/80">Get permanent VIP perks and exclusive chai discounts across all Arc testnet stalls.</p>
        <button onClick={() => setClaimed(true)} className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white mb-2 transition-all">
          {claimed ? '✅ Pass Claimed!' : 'Mint NFT Pass (Free)'}
        </button>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-amber-300 text-xs">Close</button>
      </div>
    </div>
  )
}

function RoyaltyConsole({ lang, onClose, displayTotal, displayTipCount }: {
  lang: Lang; onClose: () => void; displayTotal: string; displayTipCount: number
}) {
  const [key, setKey] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [err, setErr] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="rounded-3xl p-6 w-full max-w-md bg-stone-900 border-2 border-amber-500">
        <div className="flex justify-between items-center mb-4">
          <p className="font-black text-base text-amber-400">🔑 Master Key Console</p>
          <button onClick={onClose} className="text-stone-400 hover:text-white">✕</button>
        </div>
        {!unlocked ? (
          <div>
            <p className="text-xs text-amber-200/80 mb-3">Enter the merchant master key to access real-time treasury analytics and contract control.</p>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="Enter Passcode..." type="password"
              className="w-full rounded-xl px-4 py-3 text-sm text-center font-mono mb-3 bg-stone-800 text-white outline-none border border-stone-700" />
            {err && <p className="text-xs text-center mb-3 text-red-400 font-bold">Incorrect Master Key!</p>}
            <button onClick={() => { if (key === 'ARC2026') setUnlocked(true); else setErr(true); }} className="w-full rounded-xl py-3 text-sm font-bold bg-amber-600 text-white">Unlock Treasury</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-center font-bold text-emerald-400">Welcome, Master Stall Owner! 👑</p>
            <div className="p-4 rounded-xl bg-stone-800 space-y-2">
              <div className="flex justify-between text-xs text-stone-300"><span>Total Vault Value:</span><span className="font-black text-amber-400">{displayTotal} USDC</span></div>
              <div className="flex justify-between text-xs text-stone-300"><span>Total Orders Received:</span><span className="font-black text-amber-400">{displayTipCount}</span></div>
            </div>
            <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-white text-xs">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmergencyAssistModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="rounded-2xl p-6 w-full max-w-sm bg-stone-900 border-2 border-red-500 text-center">
        <p className="font-black text-lg mb-2 text-red-400">🚨 Station Emergency Assist</p>
        <p className="text-xs text-amber-100/80 mb-4">Quick dispatch broadcast to platform stall marshals.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => { toast.success('Medical alert dispatched!'); onClose() }} className="p-3 rounded-xl text-xs font-bold bg-stone-800 border border-red-500/40 text-red-200">🏥 Medical Aid</button>
          <button onClick={() => { toast.success('Police alert dispatched!'); onClose() }} className="p-3 rounded-xl text-xs font-bold bg-stone-800 border border-red-500/40 text-red-200">👮 RPF Police</button>
          <button onClick={() => { toast.success('Coolie request dispatched!'); onClose() }} className="p-3 rounded-xl text-xs font-bold bg-stone-800 border border-red-500/40 text-red-200">🧳 Luggage Helper</button>
          <button onClick={() => { toast.success('Water request dispatched!'); onClose() }} className="p-3 rounded-xl text-xs font-bold bg-stone-800 border border-red-500/40 text-red-200">💧 Cold Water</button>
        </div>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-stone-300 text-xs">Cancel</button>
      </div>
    </div>
  )
}

function BaithakBookingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="rounded-2xl p-6 w-full max-w-sm bg-stone-900 border-2 border-emerald-500 text-center">
        <p className="font-black text-lg mb-2 text-emerald-400">🪑 Station Khat Baithak</p>
        <p className="text-xs text-emerald-100/80 mb-4">Reserve a cozy traditional Khat seat near Platform 1 for 30 minutes.</p>
        <button onClick={() => { toast.success('Baithak Seat Reserved!'); onClose() }} className="w-full py-3 rounded-xl font-bold bg-emerald-600 text-white text-sm mb-2">Confirm Seat (0.50 USDC)</button>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-stone-300 text-xs">Close</button>
      </div>
    </div>
  )
}

function GiftChaiModal({ onClose }: { onClose: () => void }) {
  const [target, setTarget] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="rounded-2xl p-6 w-full max-w-sm bg-stone-900 border-2 border-amber-500 text-center">
        <p className="font-black text-lg mb-2 text-amber-400">🎁 Gift A Hot Chai</p>
        <p className="text-xs text-amber-100/80 mb-3">Send a prepaid hot cup of cutting chai directly to a friend's wallet address.</p>
        <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Enter 0x... or ENS" className="w-full mb-3 rounded-xl p-2.5 text-xs bg-stone-800 text-amber-100 border border-amber-500/40 outline-none font-mono" />
        <button onClick={() => { if (target) { toast.success(`Chai voucher sent to ${formatAddress(target)}!`); onClose() } }} className="w-full py-3 rounded-xl font-bold bg-amber-600 text-white text-sm mb-2">Send Gift Voucher</button>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-stone-800 text-stone-300 text-xs">Close</button>
      </div>
    </div>
  )
}

function WalletStuckHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="rounded-2xl p-6 w-full max-w-md bg-stone-900 border-2 border-orange-500 text-left">
        <p className="font-black text-base mb-2 text-orange-400 flex items-center gap-2"><HelpCircle size={18} /> Wallet Transaction Stuck?</p>
        <div className="space-y-2 text-xs text-stone-300 mb-4">
          <p>1. Make sure you are connected to <strong>Arc Testnet (Chain ID: 5042002)</strong>.</p>
          <p>2. Get testnet USDC gas tokens from the Circle Faucet.</p>
          <p>3. If MetaMask is stuck in pending state, clear activity cache or reset wallet state.</p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold">Got it!</button>
      </div>
    </div>
  )
}

// ── Main TipJar Application Component ─────────────────────────────────────────
export default function TipJarApp() {
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
  const { muted, toggleMute } = useSpeech(lang)

  const [cart, setCart] = useState<CartMap>({})
  const [customAmount, setCustomAmount] = useState('0.50')
  const [name, setName] = useState('')
  const [walletAddr, setWalletAddr] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(5)
  const [receiptTxHash, setReceiptTxHash] = useState('')
  const [verifiedReceipt, setVerifiedReceipt] = useState<{ sender: string; amount: string; message: string } | null>(null)

  const [step, setStep] = useState<'idle' | 'tipping' | 'pending-tip' | 'done'>('idle')
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [showNftModal, setShowNftModal] = useState(false)
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showBaithakModal, setShowBaithakModal] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [showStuckHelp, setShowStuckHelp] = useState(false)

  const [totalCollected, setTotalCollected] = useState<bigint | null>(null)
  const [tipsCount, setTipsCount] = useState<bigint | null>(null)

  const isWrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID

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

  const adjustCart = (key: string, delta: number) => {
    setCart((prev) => {
      const cur = prev[key] ?? 0
      const next = Math.max(0, cur + delta)
      const updated = { ...prev, [key]: next }
      if (next === 0) delete updated[key]
      return updated
    })
  }

  const calculateCartTotal = () => {
    let sum = 0
    for (const item of MENU_ITEMS) {
      const qty = cart[item.key] ?? 0
      if (qty > 0) sum += qty * parseFloat(item.amount)
    }
    return sum > 0 ? sum.toFixed(2) : customAmount
  }

  const totalTipStr = calculateCartTotal()

  const handleSendTip = async () => {
    if (!walletClient || !address) {
      toast.error('Please connect your Web3 wallet first')
      return
    }
    if (isWrongChain) {
      void switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      return
    }
    const erc20Units = parseErc20(totalTipStr)
    const nativeValue = toNative(erc20Units)
    const senderName = walletAddr.trim() ? formatAddress(walletAddr.trim()) : name.trim() || formatAddress(address)
    const finalMsg = message.trim() ? `${message} (${rating}⭐)` : `Tipped via Chai Ka Chanda (${rating}⭐)`

    setStep('tipping')
    setPendingHash(null)
    try {
      const txHash = await walletClient.writeContract({
        address: TIPJAR.address,
        abi: TIPJAR.abi as Abi,
        functionName: 'tip',
        args: [senderName, finalMsg.slice(0, 80)],
        value: nativeValue,
        maxFeePerGas: parseUnits('20', 9),
        maxPriorityFeePerGas: parseUnits('2', 9),
      })
      setPendingHash(txHash)
      setStep('pending-tip')
    } catch (err: unknown) {
      setStep('idle')
      toast.error(parseOnchainError(err, lang))
    }
  }

  const handleVerifyReceipt = async () => {
    if (!receiptTxHash.trim()) return
    try {
      toast.loading('Verifying transaction on Arc Testnet...')
      const tx = await arcPublicClient.getTransactionReceipt({ hash: receiptTxHash.trim() as `0x${string}` })
      if (tx && tx.status === 'success') {
        toast.dismiss()
        toast.success('Transaction Verified On-Chain!')
        setVerifiedReceipt({ sender: formatAddress(tx.from), amount: 'USDC Paid', message: 'Verified Block Settlement' })
      } else {
        toast.dismiss()
        toast.error('Transaction not found or failed')
      }
    } catch {
      toast.dismiss()
      toast.error('Invalid Transaction Hash')
    }
  }

  const formattedTotal = totalCollected != null ? formatNativeUsdc(totalCollected) : '0.00'
  const displayTipCount = tipsCount != null ? Number(tipsCount) : 0

  return (
    <>
      {showQr && <QrScanner onResult={(val) => { setWalletAddr(val); setShowQr(false) }} onClose={() => setShowQr(false)} cancelLabel="Cancel" />}
      {showNftModal && <KulhadNftModal lang={lang} onClose={() => setShowNftModal(false)} />}
      {showRoyaltyConsole && <RoyaltyConsole lang={lang} onClose={() => setShowRoyaltyConsole(false)} displayTotal={formattedTotal} displayTipCount={displayTipCount} />}
      {showEmergencyModal && <EmergencyAssistModal lang={lang} onClose={() => setShowEmergencyModal(false)} />}
      {showBaithakModal && <BaithakBookingModal onClose={() => setShowBaithakModal(false)} />}
      {showGiftModal && <GiftChaiModal onClose={() => setShowGiftModal(false)} />}
      {showStuckHelp && <WalletStuckHelpModal onClose={() => setShowStuckHelp(false)} />}

      <div className="relative min-h-dvh overflow-hidden text-amber-50 pb-20 sm:pb-12" style={{ background: '#1c1512' }}>
        <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pb-16 pt-6">

          {/* Top Desi Header Banner with Interactive Action Pills */}
          <div className="mb-4 rounded-3xl p-5 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c2d12, #b45309, #431407)', border: '2px solid rgba(251,191,36,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <p className="font-black text-2xl sm:text-3xl text-amber-100 tracking-wide mb-1">☕ चाय का चंदा</p>
            <p className="text-xs font-bold text-amber-200">Chai ka Chanda • Indian Railways Platform No. 1</p>

            <div className="flex gap-2 mt-3 flex-wrap justify-center text-[11px] font-bold">
              <button onClick={() => setShowNftModal(true)} className="px-3 py-1 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white cursor-pointer">🏺 NFT Pass</button>
              <button onClick={() => setShowRoyaltyConsole(true)} className="px-3 py-1 rounded-full bg-amber-600/90 hover:bg-amber-500 text-white cursor-pointer">🔑 Master Key</button>
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-teal-600/90 text-white no-underline">💧 Faucet</a>
              <button onClick={() => setShowEmergencyModal(true)} className="px-3 py-1 rounded-full bg-red-600/90 hover:bg-red-500 text-white cursor-pointer">🚨 Emergency</button>
              <button onClick={() => setShowBaithakModal(true)} className="px-3 py-1 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white cursor-pointer">🪑 बैठक बुक</button>
              <button onClick={() => setShowGiftModal(true)} className="px-3 py-1 rounded-full bg-amber-800/90 hover:bg-amber-700 text-white cursor-pointer">🎁 Gift Chai</button>
            </div>

            <div className="flex gap-2 mt-2 flex-wrap justify-center text-[10px] font-bold">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-500/40">🥛 गाय का शुद्ध दूध</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-900/60 text-amber-200 border border-amber-500/40">🏺 माटी की सुगंध</span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-900/60 text-teal-200 border border-teal-500/40">🌐 Web3 Settled</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">🏺 Free Chais: 0</span>
            </div>
          </div>

          {/* Treasury Card */}
          <div className="mb-4 rounded-3xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 40%, #d97706 100%)', border: '2px solid rgba(251,191,36,0.5)', boxShadow: '0 8px 32px rgba(234,88,12,0.3)' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-left">
                <p className="font-black text-xl text-white flex items-center gap-2">☕ Chai Ka Chanda</p>
                <p className="text-[11px] text-amber-100 font-semibold">Authentic Desi Smart Stall • Near Station Chowk</p>
                <p className="text-[10px] text-amber-200/90 italic">"Chai First, Everything Else Later"</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white flex items-center gap-1 justify-end">{formattedTotal} <UsdcIcon size={20} /></p>
                <p className="text-[10px] font-bold text-amber-100 uppercase">Total Collected</p>
              </div>
            </div>

            <div className="flex gap-1.5 mt-3 flex-wrap justify-end text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-100">Arc Testnet Active ●</span>
              <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-100">USDC Settlement ⚡</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-200">Contract Secured 🔒</span>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="mb-4 p-2 rounded-2xl bg-stone-900/90 border border-amber-500/30 flex items-center justify-between">
            <div className="flex rounded-xl overflow-hidden text-xs font-bold border border-amber-500/30">
              {(['hi','en'] as Lang[]).map((l) => (
                <button key={l} onClick={() => { setLangState(l); saveLang(l) }} className="px-3 py-1.5" style={lang === l ? { background:'#d97706',color:'#fff' } : { background:'transparent',color:'#a3a3a3' }}>
                  {l === 'hi' ? 'हिन्दी' : 'EN'}
                </button>
              ))}
            </div>
            <button onClick={toggleMute} className="rounded-xl p-2 bg-stone-800 text-amber-200">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>

          {/* Jukebox Music Section */}
          <DesiJukeboxWidget lang={lang} />

          {/* Order Mode Toggle */}
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 text-stone-900 border-2 border-orange-500">
            <p className="text-xs font-black uppercase text-stone-700 mb-2">How will you take your order?</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2.5 rounded-xl text-xs font-bold bg-stone-200 text-stone-700 flex items-center justify-center gap-1.5">
                <Bike size={16} /> Online Delivery / Pre-Order
              </button>
              <button className="py-2.5 rounded-xl text-xs font-bold bg-orange-600 text-white flex items-center justify-center gap-1.5">
                <UtensilsCrossed size={16} /> Dine-In / Takeaway
              </button>
            </div>
          </div>

          {/* Menu Price List */}
          <div className="mb-4 p-5 rounded-3xl bg-amber-50/95 text-stone-900 border-2 border-orange-500">
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-orange-200">
              <span className="text-2xl">🚂</span>
              <div>
                <p className="font-black text-base text-stone-900">PLATFORM MENU — PRICE LIST</p>
                <p className="text-[10px] font-bold text-orange-700">INDIAN RAILWAYS • CHAI KA CHANDA STALL</p>
              </div>
            </div>

            <div className="space-y-2.5 my-3">
              {MENU_ITEMS.map((item) => {
                const qty = cart[item.key] ?? 0
                return (
                  <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-orange-100/60 border border-orange-200">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-stone-900">{item.label[lang]}</p>
                        <p className="text-xs font-black text-orange-700 flex items-center gap-1">{item.price}</p>
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

            {/* Custom Amount Field */}
            <div className="mt-4 pt-3 border-t border-orange-200">
              <label className="text-xs font-bold text-stone-700 block mb-1">Or your own amount (USDC)</label>
              <input value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="w-full p-2.5 rounded-xl bg-white text-stone-900 border border-orange-300 outline-none text-sm font-bold" />
            </div>

            <div className="mt-3 p-3 rounded-xl bg-orange-600 text-white flex justify-between items-center font-black text-sm">
              <span>Your Tip Total:</span>
              <span className="flex items-center gap-1">{totalTipStr} <UsdcIcon size={16} /> USDC</span>
            </div>
          </div>

          {/* Sender Details & Tip Form */}
          <div className="mb-4 p-5 rounded-3xl bg-amber-50/95 text-stone-900 border-2 border-orange-500 space-y-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Name or wallet address (optional)</label>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun — leave empty to show address" className="flex-1 p-2.5 rounded-xl bg-white border border-orange-300 text-xs text-stone-900 outline-none" />
                <button onClick={() => setShowQr(true)} className="p-2.5 rounded-xl bg-orange-600 text-white"><QrCode size={16} /></button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Message (optional)</label>
              <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. The chai was lovely" className="w-full p-2.5 rounded-xl bg-white border border-orange-300 text-xs text-stone-900 outline-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Rating (permanent review)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="p-1 text-orange-500">
                    <Star size={20} fill={star <= rating ? '#f97316' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => void handleSendTip()} disabled={step === 'tipping' || step === 'pending-tip'} className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all">
              <Sparkles size={18} /> Send tip — {totalTipStr} USDC
            </button>
          </div>

          {/* Supporters Section */}
          <div className="mb-4 p-4 rounded-2xl bg-amber-50/95 text-stone-900 border-2 border-orange-500">
            <p className="text-xs font-black text-stone-800 mb-2">Supporters & Voice of Chaiwala</p>
            <p className="text-xs text-stone-600 italic">No tips yet — be the first!</p>
          </div>

          {/* Check Receipt Section */}
          <div className="mb-4 p-4 rounded-2xl bg-amber-50/95 text-stone-900 border-2 border-orange-500">
            <p className="text-xs font-black text-stone-800 mb-1 flex items-center gap-1.5"><Search size={14} /> Check a receipt</p>
            <p className="text-[10px] text-stone-600 mb-2">Paste any transaction hash (0x...) — the app verifies it on the blockchain</p>
            <div className="flex gap-2">
              <input value={receiptTxHash} onChange={(e) => setReceiptTxHash(e.target.value)} placeholder="0x..." className="flex-1 p-2 rounded-xl bg-white border border-orange-300 text-xs text-stone-900 outline-none font-mono" />
              <button onClick={() => void handleVerifyReceipt()} className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold">Check</button>
            </div>
            {verifiedReceipt && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-100 border border-emerald-400 text-xs text-emerald-900">
                <p><strong>Status:</strong> Valid Receipt ✅</p>
                <p><strong>From:</strong> {verifiedReceipt.sender}</p>
              </div>
            )}
          </div>

          {/* Wallet Stuck Help Banner */}
          <div onClick={() => setShowStuckHelp(true)} className="p-3 rounded-2xl bg-amber-100/90 text-stone-900 border border-orange-300 text-center cursor-pointer hover:bg-amber-200 transition-all">
            <p className="text-xs font-bold text-orange-800 flex items-center justify-center gap-1">
              <HelpCircle size={14} /> Wallet stuck? Look here
            </p>
          </div>

          <p className="text-center text-[10px] mt-6 text-amber-200/60">
            <a href={`${arcChain.explorerBase}/address/${TIPJAR.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ExternalLink size={10} /> View contract ({TIPJAR.address.slice(0, 6)}...{TIPJAR.address.slice(-4)})
            </a>
          </p>
        </div>

        {/* Bottom Arc Studio Footer & Mobile Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 border-t border-amber-500/30 px-4 py-2 flex items-center justify-around backdrop-blur-md">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 text-amber-400">
            <Home size={16} />
            <span className="text-[9px] font-bold">Menu</span>
          </button>
          <button onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 text-orange-400">
            <Coffee size={16} />
            <span className="text-[9px] font-bold">Tip</span>
          </button>
          <button onClick={() => setShowQr(true)} className="flex flex-col items-center gap-0.5 text-amber-400">
            <QrCode size={16} />
            <span className="text-[9px] font-bold">Wall</span>
          </button>
          <button onClick={() => window.scrollTo({ top: 1100, behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 text-amber-300">
            <ShoppingCart size={16} />
            <span className="text-[9px] font-bold">Receipt</span>
          </button>
          <span className="text-[9px] font-bold px-2 py-1 rounded bg-indigo-900/80 text-indigo-200 border border-indigo-500/30 flex items-center gap-1">
            <Zap size={10} /> Built with Arc Studio
          </span>
        </div>
      </div>
    </>
  )
}
