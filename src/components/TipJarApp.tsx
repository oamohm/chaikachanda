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
  Award,
  Camera,
  Music,
  CheckCircle2,
  Clock,
  PackageCheck,
} from 'lucide-react'

// CONFIGURATION & CONSTANTS
const ARC_TESTNET_CHAIN_ID = 5042002
const ARC_RPC = 'https://rpc.testnet.arc.network'
const TIPJAR_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197' as `0x${string}`
const DEFAULT_MERCHANT_ADDRESS = '0xc5369de91014da165fc0031937f3106bca'

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
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'chai', nameHi: 'कटिंग चाय', nameEn: 'Cutting Chai', emoji: '🍵', price: '0.25 USDC', amount: 0.25 },
  { key: 'kulhadChai', nameHi: 'कुल्हड़ चाय', nameEn: 'Kulhad Chai', emoji: '🏺', price: '0.50 USDC', amount: 0.50 },
  { key: 'masalaChai', nameHi: 'रॉयल मसाला चाय', nameEn: 'Royal Masala Chai', emoji: '🫖', price: '0.75 USDC', amount: 0.75 },
  { key: 'samosa', nameHi: 'गरम समोसा (2 पीस)', nameEn: 'Crispy Samosa (2 pcs)', emoji: '🥟', price: '0.50 USDC', amount: 0.50 },
  { key: 'kachori', nameHi: 'राजस्थानी कचौरी', nameEn: 'Rajasthani Kachori', emoji: '🫓', price: '0.60 USDC', amount: 0.60 },
  { key: 'combo', nameHi: 'चाय + समोसा कॉम्बो', nameEn: 'Chai + Samosa Combo', emoji: '🍵🥟', price: '1.00 USDC', amount: 1.00 },
  { key: 'lassi', nameHi: 'मलाई लस्सी', nameEn: 'Sweet Clay Lassi', emoji: '🥛', price: '0.80 USDC', amount: 0.80 },
  { key: 'aloo', nameHi: 'देशी घी पराठा', nameEn: 'Desi Ghee Paratha', emoji: '🫔', price: '1.25 USDC', amount: 1.25 },
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
  const [merchantAddress, setMerchantAddress] = useState(DEFAULT_MERCHANT_ADDRESS)
  const [isProcessing, setIsProcessing] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)

  const [contractTotal, setContractTotal] = useState<string>('7.05')
  const [contractTipsCount, setContractTipsCount] = useState<number>(12)
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(10)

  // Modals
  const [showSafeDepositModal, setShowSafeDepositModal] = useState(false)
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
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
      console.warn('Fallback active')
    }
  }

  useEffect(() => {
    fetchOnChainData()
    const interval = setInterval(fetchOnChainData, 12000)
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

  const handlePayment = async (overrideAmt?: number) => {
    const payAmount = overrideAmt !== undefined ? overrideAmt : cartTotal
    if (payAmount <= 0) {
      toast.error(lang === 'hi' ? 'कृपया आइटम चुनें' : 'Please select items')
      return
    }

    if (!isConnected || !walletClient) {
      toast.error(lang === 'hi' ? 'वॉलेट कनेक्ट करें' : 'Connect wallet first')
      return
    }

    if (chainId !== ARC_TESTNET_CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      } catch {
        toast.error(lang === 'hi' ? 'Arc Testnet पर स्विच करें' : 'Switch to Arc Testnet')
        return
      }
    }

    setIsProcessing(true)
    speak(lang === 'hi' ? 'ऑर्डर प्रोसेस हो रहा है' : 'Processing order')

    try {
      const valueInWei = parseUnits(payAmount.toFixed(6), 18)
      const txHash = await walletClient.writeContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'tip',
        args: [name || 'Patron', message || `Order [${fulfillment}]`],
        value: valueInWei,
      })

      const client = publicClient || createPublicClient({ transport: http(ARC_RPC) })
      await client.waitForTransactionReceipt({ hash: txHash })

      toast.success(lang === 'hi' ? 'चंदा सफलतापूर्वक जमा हुआ!' : 'Payment successful!')
      speak(lang === 'hi' ? 'धन्यवाद! आपका ऑर्डर दर्ज हो गया है।' : 'Thank you for your order.')

      setCart({})
      setMessage('')
      setLoyaltyPoints((prev) => prev + 5)
      fetchOnChainData()
    } catch (err: any) {
      toast.error(lang === 'hi' ? 'ट्रांजेक्शन असफल रहा' : 'Transaction failed')
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
        args: [name || 'Traveler', 'SAFE_KIOSK_PANIC_VAULT_DEPOSIT'],
        value: valueInWei,
      })
      const client = publicClient || createPublicClient({ transport: http(ARC_RPC) })
      await client.waitForTransactionReceipt({ hash: txHash })
      setVaultTokenId('VAULT-CHAI-' + Math.floor(100000 + Math.random() * 900000))
      toast.success('फंड सुरक्षित लॉक हो गया!')
    } catch {
      toast.error('डिपॉजिट असफल रहा')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen w-full font-sans pb-28 px-3 sm:px-6 text-amber-950" style={{ background: '#fdf6e2' }}>
      
      {/* TOP HEADER / TAGLINES & SOCIALS */}
      <header className="max-w-5xl mx-auto pt-3 mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-900 px-2">
          <div className="flex items-center gap-3">
            <span className="bg-amber-200 px-2.5 py-1 rounded-full border border-amber-400">🌿 Cash Today, Credit Tomorrow</span>
            <span className="hidden sm:inline opacity-80">☕ Chai Pe Charcha — No Ledger Log</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')} className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 border border-amber-400 cursor-pointer">
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>
            <button onClick={() => setSoundMuted(!soundMuted)} className="p-1 rounded-full bg-amber-200 border border-amber-400 cursor-pointer">
              {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>
        </div>

        {/* HERO BANNER */}
        <div className="rounded-3xl p-6 border border-amber-500/40 shadow-xl relative overflow-hidden text-center"
             style={{ background: 'linear-gradient(135deg, #f7ebd0 0%, #fae1af 100%)' }}>
          
          <h1 className="text-3xl sm:text-4xl font-black text-amber-900 tracking-wide drop-shadow-sm mb-1">
            CHAI KA CHANDA
          </h1>
          <p className="text-xs font-bold text-amber-800 mb-3">
            WEB3 SMART CHAI STALL • Fresh Desi Chai & Crispy Snacks • Pay with USDC
          </p>

          <div className="max-w-md mx-auto mb-4 py-1.5 px-3 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-700" /> 100% Private & Secure — Zero Public Log
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setShowSafeDepositModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition flex items-center gap-1 cursor-pointer shadow">
              <Lock size={12} /> {lang === 'hi' ? 'सुरक्षित डिपाजिट (Panic Vault)' : 'Safe Vault Deposit'}
            </button>
            <button onClick={() => setShowRoyaltyConsole(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition flex items-center gap-1 cursor-pointer shadow">
              <Key size={12} /> {lang === 'hi' ? 'मास्टर की कंसोल' : 'Master Key'}
            </button>
            <button onClick={() => setShowEmergencyModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-700 text-white hover:bg-red-600 transition flex items-center gap-1 cursor-pointer shadow">
              🚨 {lang === 'hi' ? 'इमरजेंसी' : 'Emergency'}
            </button>
            <button onClick={() => setShowBaithakModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-700 transition flex items-center gap-1 cursor-pointer shadow">
              🪑 {lang === 'hi' ? 'बैठक बुक' : 'Book Baithak'}
            </button>
            <button onClick={() => setShowGiftModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-600 transition flex items-center gap-1 cursor-pointer shadow">
              🎁 {lang === 'hi' ? 'गिफ्ट चाय' : 'Gift Chai'}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN GRID LAYOUT */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT COLUMN: MENU, SPECIALS & LOYALTY CARD */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Digital Kulhad NFT Loyalty Card */}
          <div className="rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between"
               style={{ background: 'linear-gradient(135deg, #6b3410 0%, #421b0e 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-2xl">
                🏺
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Digital Kulhad NFT Loyalty Card</p>
                <h4 className="text-xs font-bold text-amber-100">Unique on-chain collectibles & loyalty points unlocked on every successful order</h4>
              </div>
            </div>
            <div className="text-right pl-2">
              <span className="text-xs font-black text-amber-300 bg-black/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
                {loyaltyPoints} PTS
              </span>
            </div>
          </div>

          {/* Today's Special */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">Today's Special</p>
              <p className="text-xs font-black">Cutting Chai + 2 Samosas</p>
              <p className="text-[11px] font-medium opacity-90">1.00 USDC • SAVE 20% • Fresh Elaichi Blend</p>
            </div>
            <span className="px-2.5 py-1 bg-black/30 rounded-xl text-xs font-bold">HOT</span>
          </div>

          {/* Desi FM Music Player */}
          <div className="p-3 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <Music size={16} className="text-amber-400" />
              <span className="text-xs font-bold">Desi FM 92.7 — Lo-Fi Chai Beats</span>
            </div>
            <audio controls loop className="h-8 max-w-[140px]" src="https://cdn.pixabay.com/audio/2022/10/31/audio_b5a1d5f9d5.mp3" />
          </div>

          {/* Analytics / Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-amber-200/60 border border-amber-400/60 text-center">
              <p className="text-[10px] font-bold text-amber-800">Total Sales</p>
              <p className="text-base font-black text-amber-900">{contractTotal} USDC</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-200/60 border border-amber-400/60 text-center">
              <p className="text-[10px] font-bold text-amber-800">In Wallet</p>
              <p className="text-base font-black text-amber-900">954.66 USDC</p>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wide px-1">Fresh Desi Menu</h3>
            {MENU_ITEMS.map((item) => {
              const qty = cart[item.key] || 0
              return (
                <div key={item.key} className="p-3 rounded-2xl bg-white/90 border border-amber-300 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div>
                      <h4 className="font-bold text-xs text-amber-950">{lang === 'hi' ? item.nameHi : item.nameEn}</h4>
                      <p className="text-[11px] font-black text-amber-700">{item.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {qty > 0 && <span className="text-xs font-bold text-amber-900 px-1">{qty}</span>}
                    <button
                      onClick={() => updateCart(item.key, 1)}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 text-white font-black text-xs hover:bg-orange-500 transition cursor-pointer shadow"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: ORDER CONSOLE & VERIFIED MERCHANT */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-4 rounded-3xl p-5 bg-white/95 border border-amber-400 shadow-xl space-y-4">
            
            <h3 className="text-sm font-black text-amber-900 border-b border-amber-200 pb-2 flex items-center justify-between">
              <span>Place Order / Pay Tip</span>
              <span className="text-[10px] text-amber-700 font-semibold">Order Ticket</span>
            </h3>

            {/* Fulfillment Type */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1 block">Order Fulfillment</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFulfillment('delivery')}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    fulfillment === 'delivery' ? 'bg-orange-600 text-white border-orange-600' : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  Online Delivery / Pre-Order
                </button>
                <button
                  onClick={() => setFulfillment('dine')}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    fulfillment === 'dine' ? 'bg-orange-600 text-white border-orange-600' : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  Dine-In / Takeaway
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1 block">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi Kumar"
                className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-medium text-amber-950 outline-none focus:border-orange-500"
              />
            </div>

            {/* Verified Merchant Address Box */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-amber-900">Verified Merchant Address (Es...)</span>
                <div className="flex gap-1.5">
                  <span onClick={() => setMerchantAddress(DEFAULT_MERCHANT_ADDRESS)} className="text-emerald-700 font-bold flex items-center gap-0.5 cursor-pointer hover:underline text-[10px]">
                    ✓ Set Official Stall Address
                  </span>
                  <span onClick={() => toast.info('Camera Scanner Activated')} className="text-amber-800 font-bold flex items-center gap-0.5 cursor-pointer hover:underline text-[10px]">
                    <Camera size={10} /> Camera Scan
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={merchantAddress}
                onChange={(e) => setMerchantAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-mono text-amber-950 outline-none"
              />
            </div>

            {/* Vibe Selector Tags */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1.5 block">Pick a Vibe</label>
              <div className="flex flex-wrap gap-1.5">
                {['Cutting Chai Master', 'Extra Elaichi', 'Crunchy Banaras Vibe', 'Chai Dukaan Star', 'Qawwali Mood'].map((vibe) => (
                  <span
                    key={vibe}
                    onClick={() => setMessage(vibe)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer hover:bg-amber-200 transition"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            </div>

            {/* Special Request */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1 block">Special Request / Note</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Make it extra ginger!"
                className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-medium text-amber-950 outline-none focus:border-orange-500"
              />
            </div>

            {/* Amount Quick Buttons */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1.5 block">Amount (USDC)</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[0.25, 0.50, 1.00, 2.00].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCart({ customTip: amt })}
                    className="py-1.5 rounded-xl text-xs font-bold bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 cursor-pointer"
                  >
                    ${amt.toFixed(2)}
                  </button>
                ))}
              </div>
              <p className="text-xs font-black text-amber-900 text-right">
                Total Payable: <span className="text-orange-600">{(cartTotal > 0 ? cartTotal : (cart.customTip || 0)).toFixed(2)} USDC</span>
              </p>
            </div>

            {/* Submit / Pay Button */}
            <button
              onClick={() => handlePayment(cart.customTip)}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-sm shadow-lg hover:from-orange-500 hover:to-amber-500 transition cursor-pointer"
            >
              {isProcessing ? 'Processing...' : 'Place Order / Pay Tip 🚀'}
            </button>

          </div>
        </div>

      </main>

      {/* MODALS */}
      {showSafeDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-emerald-500 p-6 space-y-4 shadow-2xl text-amber-950">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-800 text-base flex items-center gap-2">
                <Lock size={18} /> सुरक्षित डिपाजिट (Panic Vault)
              </h3>
              <button onClick={() => setShowSafeDepositModal(false)} className="text-amber-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              अकेले हैं और खतरा महसूस हो रहा है? अपने फंड को सुरक्षित वाल्ट में जमा करें और यूनिक क्लेम आईडी पाएं।
            </p>
            <input
              type="text"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Deposit Amount (USDC)"
              className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold"
            />
            {vaultTokenId && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-400 text-center font-mono font-black text-xs text-emerald-950">
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
          <div className="w-full max-w-md rounded-3xl bg-white border border-amber-500 p-6 space-y-4 shadow-2xl text-amber-950">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-900 text-base">🔑 Master Key Console</h3>
              <button onClick={() => setShowRoyaltyConsole(false)} className="text-amber-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-amber-800">Analytics, Royalty, and Nominee Management</p>
            <button onClick={() => setShowRoyaltyConsole(false)} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-red-500 p-6 space-y-4 shadow-2xl text-amber-950">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-red-800 text-base">🚨 इमरजेंसी मदद (Emergency Assist)</h3>
              <button onClick={() => setShowEmergencyModal(false)} className="text-amber-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-amber-900">0.10 USDC का तुरंत माइक्रो-ट्रांजेक्शन करके मदद अलर्ट भेजें।</p>
            <button
              onClick={() => { setShowEmergencyModal(false); handlePayment(0.10) }}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer"
            >
              🚨 0.10 USDC मदद भेजें
            </button>
          </div>
        </div>
      )}

      {showBaithakModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-emerald-500 p-6 space-y-4 shadow-2xl text-amber-950">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-800 text-base">🪑 बैठक / खाट रिजर्वेशन</h3>
              <button onClick={() => setShowBaithakModal(false)} className="text-amber-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-amber-900">0.50 USDC का टोकन अमाउंट देकर अपनी चारपाई रिजर्व करें।</p>
            <button
              onClick={() => { setShowBaithakModal(false); handlePayment(0.50) }}
              className="w-full py-3 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
            >
              🪑 0.50 USDC से बुक करें
            </button>
          </div>
        </div>
      )}

      {showGiftModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-purple-500 p-6 space-y-4 shadow-2xl text-amber-950">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-purple-800 text-base">🎁 गिफ्ट ए चाय (Pay-it-Forward)</h3>
              <button onClick={() => setShowGiftModal(false)} className="text-amber-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-amber-900">0.50 USDC फ्री कम्युनिटी पूल में जोड़ें ताकि कोई ज़रूरतमंद मुफ्त चाय पी सके।</p>
            <button
              onClick={() => { setShowGiftModal(false); handlePayment(0.50) }}
              className="w-full py-3 rounded-xl bg-purple-700 text-white font-bold text-xs cursor-pointer"
            >
              🎁 0.50 USDC पूल में डालें
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
