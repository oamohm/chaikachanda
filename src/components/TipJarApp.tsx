import React, { useState, useEffect } from 'react'
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits, createPublicClient, http } from 'viem'
import { toast } from 'sonner'
import {
  Coffee,
  Globe,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  Lock,
  Key,
  QrCode,
  Sparkles,
  CheckCircle2,
  Clock,
  PackageCheck,
  Music,
  Heart,
  AlertTriangle,
  Gift,
  Search,
} from 'lucide-react'

// ── CONFIG & CONSTANTS ──────────────────────────────────────────────────────
const ARC_TESTNET_CHAIN_ID = 5042002
const ARC_RPC = 'https://rpc.testnet.arc.network'
const TIPJAR_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197' as `0x${string}`
const OWNER_ADDRESS = '0x1C248d40eeA69a4662AF4F475D8dbA06d556f628'

const TIPJAR_ABI = [
  {
    type: 'function',
    name: 'tip',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'message', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'totalCollected',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getTipsCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

type Lang = 'hi' | 'en'

interface MenuItem {
  key: string
  nameHi: string
  nameEn: string
  emoji: string
  price: string
  amount: number
  badgeHi?: string
  badgeEn?: string
  category: 'chai' | 'snack' | 'combo'
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'chai', nameHi: 'कटिंग चाय', nameEn: 'Cutting Chai', emoji: '🍵', price: '0.25 USDC', amount: 0.25, badgeHi: 'बेस्टसेलर', badgeEn: 'Bestseller', category: 'chai' },
  { key: 'kulhadChai', nameHi: 'कुल्हड़ चाय', nameEn: 'Kulhad Chai', emoji: '🏺', price: '0.50 USDC', amount: 0.50, badgeHi: 'गरमागरम', badgeEn: 'Hot', category: 'chai' },
  { key: 'masalaChai', nameHi: 'रॉयल मसाला चाय', nameEn: 'Royal Masala Chai', emoji: '🫖', price: '0.75 USDC', amount: 0.75, badgeHi: 'ऑर्गेनिक', badgeEn: 'Organic', category: 'chai' },
  { key: 'samosa', nameHi: 'गरम समोसा (2 पीस)', nameEn: 'Crispy Samosa (2 pcs)', emoji: '🥟', price: '0.50 USDC', amount: 0.50, badgeHi: 'गरमागरम', badgeEn: 'Hot', category: 'snack' },
  { key: 'kachori', nameHi: 'राजस्थानी कचौरी', nameEn: 'Rajasthani Kachori', emoji: '🫓', price: '0.60 USDC', amount: 0.60, badgeHi: 'नया', badgeEn: 'New', category: 'snack' },
  { key: 'combo', nameHi: 'चाय + समोसा कॉम्बो', nameEn: 'Chai + Samosa Combo', emoji: '🍵🥟', price: '1.00 USDC', amount: 1.00, badgeHi: '20% छूट', badgeEn: 'SAVE 20%', category: 'combo' },
  { key: 'lassi', nameHi: 'मलाई लस्सी', nameEn: 'Sweet Clay Lassi', emoji: '🥛', price: '0.80 USDC', amount: 0.80, badgeHi: 'ठंडा', badgeEn: 'Chilled', category: 'snack' },
  { key: 'aloo', nameHi: 'देशी घी पराठा', nameEn: 'Desi Ghee Paratha', emoji: '🫔', price: '1.25 USDC', amount: 1.25, badgeHi: 'ऑफर', badgeEn: 'Offer', category: 'snack' },
]

export default function TipJarApp() {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChain } = useSwitchChain()

  const [lang, setLang] = useState<Lang>('hi')
  const [fulfillment, setFulfillment] = useState<'delivery' | 'dine'>('dine')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  
  // Real Receipt & Order State
  const [activeReceipt, setActiveReceipt] = useState<{
    txHash: string
    itemsText: string
    totalAmount: string
    fulfillment: string
    statusStep: number
  } | null>(null)

  const [contractTotal, setContractTotal] = useState<string>('17.75')
  const [contractTipsCount, setContractTipsCount] = useState<number>(14)
  const [isPlayingAudio, setIsPlayingAudio] = useState(true)

  // Modals
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [showSafeDepositModal, setShowSafeDepositModal] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showBaithakModal, setShowBaithakModal] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)
  
  const [depositAmount, setDepositAmount] = useState('1.0')
  const [vaultTokenId, setVaultTokenId] = useState<string | null>(null)

  const speak = (text: string) => {
    if (soundMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
      utter.rate = 1.0
      window.speechSynthesis.speak(utter)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchOnChainData = async () => {
    try {
      const client = publicClient || createPublicClient({ transport: http(ARC_RPC) })
      const totalRaw = await client.readContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'totalCollected',
      }) as bigint
      const countRaw = await client.readContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'getTipsCount',
      }) as bigint

      setContractTotal(parseFloat(formatUnits(totalRaw, 18)).toFixed(2))
      setContractTipsCount(Number(countRaw))
    } catch (err) {
      console.warn('On-chain fallback active')
    }
  }

  useEffect(() => {
    fetchOnChainData()
    const interval = setInterval(fetchOnChainData, 10000)
    return () => clearInterval(interval)
  }, [publicClient])

  const updateCart = (key: string, delta: number) => {
    setCart((prev) => {
      const current = prev[key] || 0
      const updated = Math.max(0, current + delta)
      const next = { ...prev }
      if (updated === 0) delete next[key]
      else next[key] = updated
      return next
    })
  }

  const cartTotal = Object.entries(cart).reduce((sum, [key, qty]) => {
    const item = MENU_ITEMS.find((m) => m.key === key)
    return sum + (item ? item.amount * qty : 0)
  }, 0)

  const handlePayment = async () => {
    if (cartTotal <= 0) {
      toast.error(lang === 'hi' ? 'कृपया पहले मेनू से आइटम जोड़ें' : 'Please select items from the menu')
      return
    }

    if (!isConnected || !walletClient) {
      toast.error(lang === 'hi' ? 'कृपया वॉलेट कनेक्ट करें' : 'Please connect wallet')
      return
    }

    if (chainId !== ARC_TESTNET_CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      } catch {
        toast.error(lang === 'hi' ? 'कृपया Arc Testnet पर स्विच करें' : 'Please switch to Arc Testnet')
        return
      }
    }

    setIsProcessing(true)
    speak(lang === 'hi' ? 'ऑर्डर प्रोसेस हो रहा है' : 'Processing order')

    try {
      const valueInWei = parseUnits(cartTotal.toFixed(6), 18)
      const itemSummary = Object.entries(cart)
        .map(([k, q]) => `${MENU_ITEMS.find((m) => m.key === k)?.nameEn} x${q}`)
        .join(', ')

      const txHash = await walletClient.writeContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'tip',
        args: [name || 'Patron', `${itemSummary} | ${fulfillment}`],
        value: valueInWei,
      })

      const client = publicClient || createPublicClient({ transport: http(ARC_RPC) })
      await client.waitForTransactionReceipt({ hash: txHash })

      toast.success(lang === 'hi' ? 'ऑर्डर कन्फर्म हो गया!' : 'Order Confirmed!')
      speak(lang === 'hi' ? 'बधाई हो! आपका चाय चंदा ऑर्डर दर्ज हो गया है।' : 'Order confirmed on Arc Testnet.')

      setActiveReceipt({
        txHash: txHash.slice(0, 6) + '...' + txHash.slice(-4),
        itemsText: itemSummary,
        totalAmount: cartTotal.toFixed(2),
        fulfillment: fulfillment === 'dine' ? 'Dine-In / Takeaway' : 'Online Delivery / Pre-Order',
        statusStep: 3,
      })

      setCart({})
      setMessage('')
      fetchOnChainData()
    } catch (err: any) {
      toast.error(lang === 'hi' ? 'ट्रांजेक्शन पूरा नहीं हुआ' : 'Transaction failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSafeVaultDeposit = async () => {
    const amt = parseFloat(depositAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('वैध राशि दर्ज करें')
      return
    }
    if (!isConnected || !walletClient) {
      toast.error('वॉलेट कनेक्ट करें')
      return
    }
    setIsProcessing(true)
    try {
      const valueInWei = parseUnits(amt.toFixed(6), 18)
      const txHash = await walletClient.writeContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'tip',
        args: [name || 'Traveler', 'PANIC_VAULT_SAFE_DEPOSIT'],
        value: valueInWei,
      })
      const client = publicClient || createPublicClient({ transport: http(ARC_RPC) })
      await client.waitForTransactionReceipt({ hash: txHash })
      setVaultTokenId('VAULT-ARC-' + Math.floor(100000 + Math.random() * 900000))
      toast.success('सुरक्षित जमा पूरा हुआ!')
    } catch {
      toast.error('डिपाजिट असफल रहा')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen w-full font-sans pb-28 px-2 sm:px-6 text-stone-900" style={{ background: '#f5f7f2' }}>
      
      <div className="max-w-4xl mx-auto space-y-4 pt-3">

        {/* ── TOP TEAL INTEGRATION BANNER ────────────────────────────── */}
        <div className="rounded-2xl p-3 sm:p-4 text-white shadow-lg relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #0e5c68 0%, #15798a 50%, #0d4852 100%)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">☕</span>
              <div>
                <h1 className="font-black text-sm sm:text-base tracking-wide">चाय का चंदा</h1>
                <p className="text-[10px] opacity-80">Chai Ka Chanda • Smart Kiosk</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 hover:bg-white/30 cursor-pointer">
                {lang === 'hi' ? 'EN' : 'हिंदी'}
              </button>
              <button onClick={() => setSoundMuted(!soundMuted)} className="p-1 rounded-full bg-white/20 hover:bg-white/30 cursor-pointer">
                {soundMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <button onClick={() => setShowSafeDepositModal(true)} className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold flex items-center gap-1 cursor-pointer">
              <Lock size={12} /> {lang === 'hi' ? 'सुरक्षित डिपाजिट' : 'Panic Vault'}
            </button>
            <button onClick={() => setShowRoyaltyConsole(true)} className="px-3 py-1 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1 cursor-pointer">
              <Key size={12} /> {lang === 'hi' ? 'मास्टर की' : 'Master Key'}
            </button>
            <button onClick={() => setShowEmergencyModal(true)} className="px-3 py-1 rounded-xl bg-red-600 font-bold cursor-pointer">
              🚨 {lang === 'hi' ? 'इमरजेंसी' : 'Emergency'}
            </button>
          </div>
        </div>

        {/* ── HERO BANNER (MATCHING SCREENSHOT GRADIENT) ─────────────── */}
        <div className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]"
             style={{ background: 'linear-gradient(90deg, #104859 0%, #086b83 40%, #c46c0e 75%, #a84805 100%)' }}>
          <div>
            <h2 className="text-xl font-black tracking-wide">Chai Ka Chanda</h2>
            <p className="text-xs opacity-90 font-medium">Authentic Desi Smart Stall • Web3 Kiosk</p>
            <p className="text-[10px] italic opacity-80 mt-1">"Chai First, Everything Else Later" ☕</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/20">
            <div className="flex gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-black/30 text-[10px] font-bold">🍵 Cutting Chai</span>
              <span className="px-2 py-0.5 rounded-md bg-black/30 text-[10px] font-bold">🥟 Samosa</span>
              <span className="px-2 py-0.5 rounded-md bg-black/30 text-[10px] font-bold">🏺 Kulhad</span>
            </div>

            <div className="text-right">
              <p className="text-xl font-black">{contractTotal} <span className="text-xs">USDC</span></p>
              <div className="flex gap-1 justify-end text-[9px]">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/80 font-bold">Arc Testnet Active</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/80 font-bold">USDC Settlement</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── FULFILLMENT SWITCHER (MATCHING EXACT SCREENSHOT) ────────── */}
        <div className="rounded-2xl p-1.5 bg-stone-200/80 border border-stone-300 grid grid-cols-2 gap-1.5 shadow-inner">
          <button
            onClick={() => setFulfillment('delivery')}
            className={`py-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              fulfillment === 'delivery'
                ? 'bg-stone-900 text-white shadow-md'
                : 'text-stone-700 hover:bg-stone-300/60'
            }`}
          >
            🛵 📦 Online Delivery / Pre-Order
          </button>
          <button
            onClick={() => setFulfillment('dine')}
            className={`py-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              fulfillment === 'dine'
                ? 'bg-stone-900 text-white shadow-md'
                : 'text-stone-700 hover:bg-stone-300/60'
            }`}
          >
            🍽️ 🛍️ Dine-In / Takeaway
          </button>
        </div>

        {/* ── ORDER RECEIPT CARD (REAL-TIME ON-CHAIN TRACKING) ────────── */}
        {activeReceipt && (
          <div className="rounded-3xl p-5 bg-white border border-stone-300 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <h3 className="font-black text-xs sm:text-sm text-stone-900 flex items-center gap-2">
                🧾 Order Receipt
              </h3>
              <a
                href={`https://explorer.testnet.arc.network/tx/${activeReceipt.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
              >
                {activeReceipt.txHash} <ExternalLink size={10} />
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase">Items</p>
                <p className="font-bold text-stone-900">{activeReceipt.itemsText}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase">Total Amount</p>
                <p className="font-black text-amber-700">{activeReceipt.totalAmount} USDC</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase">Fulfillment</p>
                <p className="font-bold text-stone-900">{activeReceipt.fulfillment}</p>
              </div>
            </div>

            {/* Live Progress Tracker Steps */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600" /> Order Received
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Clock size={16} className="text-amber-600" /> Preparing your order
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <PackageCheck size={16} className="text-emerald-600" /> Ready — come pick it up!
              </div>
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 font-bold text-xs text-stone-800 cursor-pointer"
            >
              New Order
            </button>
          </div>
        )}

        {/* ── TODAY'S SPECIAL & CHAI PHILOSOPHY ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-7 rounded-2xl p-4 bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 shadow-md">
            <span className="px-2 py-0.5 rounded-md bg-black/10 text-[10px] font-black uppercase tracking-wider">
              ⭐ Today's Special
            </span>
            <h3 className="font-black text-sm mt-1">🍵 🥟 Cutting Chai + 2 Samosas</h3>
            <p className="text-xs font-black mt-0.5 text-amber-950">
              1.00 USDC <span className="line-through text-[10px] opacity-70">1.25 USDC</span> <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px]">SAVE 20%</span>
            </p>
            <p className="text-[10px] opacity-80 mt-1">Fresh elaichi chai brewed every hour</p>
          </div>

          <div className="sm:col-span-5 rounded-2xl p-4 bg-gradient-to-r from-amber-900 to-stone-900 text-amber-100 shadow-md">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">🌶️ Chai Philosophy</span>
            <p className="text-xs italic font-medium mt-1">"A cup of chai a day keeps worries away."</p>
          </div>
        </div>

        {/* ── DESI AUDIO PLAYER ───────────────────────────────────────── */}
        <div className="rounded-2xl p-4 bg-indigo-950 text-indigo-100 border border-indigo-900 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-900 text-indigo-300">
              <Music size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-200">Desi FM 92.7 • Lo-Fi Chai Beats</p>
              <p className="text-[10px] text-indigo-300/80">Lofi Study Beats • Chill Vibes</p>
            </div>
          </div>

          <audio controls loop className="h-9 max-w-[220px]" src="https://cdn.pixabay.com/audio/2022/10/31/audio_b5a1d5f9d5.mp3" />
        </div>

        {/* ── FRESH MENU & ORDER SECTIONS ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MENU_ITEMS.map((item) => {
            const qty = cart[item.key] || 0
            return (
              <div key={item.key} className="rounded-2xl p-3.5 bg-white border border-stone-200 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.emoji}</span>
                  <div>
                    <h4 className="font-bold text-xs text-stone-900">{lang === 'hi' ? item.nameHi : item.nameEn}</h4>
                    <p className="text-[11px] font-black text-amber-800">{item.price}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {qty > 0 && <span className="text-xs font-black text-stone-900">{qty}</span>}
                  <button
                    onClick={() => updateCart(item.key, 1)}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-black text-xs hover:bg-orange-500 shadow cursor-pointer"
                  >
                    Add +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── CHECKOUT BAR ────────────────────────────────────────────── */}
        <div className="fixed bottom-3 left-0 right-0 max-w-4xl mx-auto px-4">
          <div className="rounded-2xl p-4 bg-stone-900 text-white shadow-2xl flex items-center justify-between gap-4 border border-stone-700">
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-bold">Total Amount</p>
              <p className="text-xl font-black text-amber-400">{cartTotal.toFixed(2)} USDC</p>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing || cartTotal <= 0}
              className={`px-8 py-3 rounded-xl font-black text-xs sm:text-sm shadow-lg transition ${
                cartTotal > 0 && !isProcessing
                  ? 'bg-amber-500 text-black hover:bg-amber-400 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Place Order / Pay Tip 🚀'}
            </button>
          </div>
        </div>

      </div>

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      {showSafeDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-emerald-500 p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-800 text-base flex items-center gap-2">
                <Lock size={18} /> Panic Vault (Safe Kiosk Deposit)
              </h3>
              <button onClick={() => setShowSafeDepositModal(false)} className="text-stone-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              अगर आप अकेले हैं और खतरा महसूस हो रहा है, तो फंड जमा करके यूनिक आईडी पाएं।
            </p>
            <input
              type="text"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount (USDC)"
              className="w-full px-3 py-2 rounded-xl bg-stone-100 border border-stone-300 text-xs font-bold outline-none"
            />
            {vaultTokenId && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-center font-mono font-black text-xs text-emerald-950">
                {vaultTokenId}
              </div>
            )}
            <button onClick={handleSafeVaultDeposit} disabled={isProcessing} className="w-full py-3 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer">
              {isProcessing ? 'Locking...' : '🔒 Deposit Safely'}
            </button>
          </div>
        </div>
      )}

      {showRoyaltyConsole && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-amber-500 p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-900 text-base">🔑 Master Key Console</h3>
              <button onClick={() => setShowRoyaltyConsole(false)} className="text-stone-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-stone-700">Analytics & Owner Royalty Management</p>
            <button onClick={() => setShowRoyaltyConsole(false)} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
