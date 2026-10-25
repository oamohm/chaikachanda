import React, { useState, useEffect, useRef } from 'react'
import {
  useAccount,
  useDisconnect,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits, createPublicClient, http } from 'viem'
import { toast } from 'sonner'
import {
  Coffee,
  Heart,
  Users,
  TrendingUp,
  Globe,
  Award,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sparkles,
  QrCode,
  Flame,
  Calendar,
  Gift,
  ExternalLink,
} from 'lucide-react'

// ── CONFIGURATION & CONSTANTS ────────────────────────────────────────────────
const ARC_TESTNET_CHAIN_ID = 5042002
const ARC_RPC = 'https://rpc.testnet.arc.network'
const TIPJAR_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197' as `0x${string}`
const OWNER_ADDRESS = '0x1C248d40eeA69a4662AF4F475D8dbA06d556f628'
const FAUCET_URL = 'https://faucet.circle.com'

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
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
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
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'chai', nameHi: 'कटिंग चाय', nameEn: 'Cutting Chai', emoji: '🍵', price: '0.25 USDC', amount: 0.25, badgeHi: 'बेस्टसेलर', badgeEn: 'Bestseller' },
  { key: 'kulhadChai', nameHi: 'कुल्हड़ चाय', nameEn: 'Kulhad Chai', emoji: '🏺', price: '0.50 USDC', amount: 0.50, badgeHi: 'गरमागरम', badgeEn: 'Hot' },
  { key: 'masalaChai', nameHi: 'मसाला चाय', nameEn: 'Masala Chai', emoji: '🫖', price: '0.75 USDC', amount: 0.75, badgeHi: 'ऑर्गेनिक', badgeEn: 'Organic' },
  { key: 'samosa', nameHi: 'गरम समोसा', nameEn: 'Hot Samosa', emoji: '🥟', price: '0.50 USDC', amount: 0.50, badgeHi: 'गरमागरम', badgeEn: 'Hot' },
  { key: 'kachori', nameHi: 'खस्ता कचौरी', nameEn: 'Crispy Kachori', emoji: '🫓', price: '0.60 USDC', amount: 0.60, badgeHi: 'नया', badgeEn: 'New' },
  { key: 'lassi', nameHi: 'मलाई लस्सी', nameEn: 'Malai Lassi', emoji: '🥛', price: '0.80 USDC', amount: 0.80, badgeHi: 'ऑर्गेनिक', badgeEn: 'Organic' },
  { key: 'aloo', nameHi: 'आलू पराठा', nameEn: 'Aloo Paratha', emoji: '🫔', price: '1.25 USDC', amount: 1.25, badgeHi: 'ऑफर', badgeEn: 'Offer' },
  { key: 'combo', nameHi: 'चाय + समोसा कॉम्बो', nameEn: 'Chai + Samosa Combo', emoji: '🍵🥟', price: '1.00 USDC', amount: 1.00, badgeHi: 'ऑफर', badgeEn: 'Offer' },
  { key: 'kulhad', nameHi: 'विशेष कुल्हड़', nameEn: 'Kulhad Special', emoji: '🏺✨', price: '2.50 USDC', amount: 2.50 },
]

const GLOBAL_MUSIC_STATIONS = [
  { country: '🇮🇳 India (Desi Lofi)', title: 'Desi Chai Beats', src: 'https://cdn.pixabay.com/audio/2022/10/31/audio_b5a1d5f9d5.mp3' },
  { country: '🇯🇵 Japan (Tokyo Chill)', title: 'Sakura Ambient', src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3' },
  { country: '🇺🇸 USA (Sunset Lo-Fi)', title: 'Pacific Vibes', src: 'https://cdn.pixabay.com/audio/2021/11/25/audio_5358a6a049.mp3' },
  { country: '🇫🇷 France (Paris Café)', title: 'Accordion Lounge', src: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf756.mp3' },
]

export default function TipJarApp() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChain } = useSwitchChain()

  const [lang, setLang] = useState<Lang>('hi')
  const [activeTab, setActiveTab] = useState<'order' | 'hub' | 'vault' | 'perks'>('order')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  
  // On-chain state
  const [contractTotal, setContractTotal] = useState<string>('0.00')
  const [contractTipsCount, setContractTipsCount] = useState<number>(0)
  const [freeChaiPool, setFreeChaiPool] = useState<number>(3)
  const [userOrderCount, setUserOrderCount] = useState<number>(2)

  // Modals
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showBaithakModal, setShowBaithakModal] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)

  // Speech Helper
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

  // Fetch On-Chain Data
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
      console.warn('On-chain read fallback:', err)
    }
  }

  useEffect(() => {
    fetchOnChainData()
    const interval = setInterval(fetchOnChainData, 12000)
    return () => clearInterval(interval)
  }, [publicClient])

  // Cart Calculations
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

  const calculateTotal = (): number => {
    return Object.entries(cart).reduce((sum, [key, qty]) => {
      const item = MENU_ITEMS.find((m) => m.key === key)
      return sum + (item ? item.amount * qty : 0)
    }, 0)
  }

  const cartTotal = calculateTotal()

  // Transaction Handler
  const handlePayment = async (overrideAmount?: number, customNote?: string) => {
    const payAmount = overrideAmount !== undefined ? overrideAmount : cartTotal
    if (payAmount <= 0) {
      toast.error(lang === 'hi' ? 'कृपया मेनू से आइटम चुनें' : 'Please select items from the menu')
      return
    }

    if (!isConnected || !walletClient) {
      toast.error(lang === 'hi' ? 'कृपया पहले वॉलेट कनेक्ट करें' : 'Please connect your wallet first')
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
    speak(lang === 'hi' ? 'ट्रांजेक्शन शुरू हो रहा है' : 'Initiating transaction')

    try {
      const valueInWei = parseUnits(payAmount.toFixed(6), 18)
      const txHash = await walletClient.writeContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'tip',
        args: [name || 'Anonymous', customNote || message || 'Chai Order'],
        value: valueInWei,
      })

      toast.success(lang === 'hi' ? 'ट्रांजेक्शन भेजा गया!' : 'Transaction Sent!')

      const client = publicClient || createPublicClient({ transport: http(ARC_RPC) })
      await client.waitForTransactionReceipt({ hash: txHash })

      toast.success(lang === 'hi' ? 'शुभकामनाएं! चंदा जमा हो गया।' : 'Success! Transaction confirmed.')
      speak(lang === 'hi' ? 'धन्यवाद! आपका चाय चंदा जमा हो गया है।' : 'Thank you! Your chai contribution is received.')

      setCart({})
      setMessage('')
      setUserOrderCount((prev) => prev + 1)
      fetchOnChainData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.shortMessage || (lang === 'hi' ? 'ट्रांजेक्शन असफल रहा' : 'Transaction failed'))
      speak(lang === 'hi' ? 'ट्रांजेक्शन पूरा नहीं हो सका' : 'Transaction failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const isOwnerConnected = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase()

  return (
    <div className="min-h-screen text-amber-50 selection:bg-amber-500 selection:text-black font-sans pb-24"
         style={{ background: 'linear-gradient(180deg, #180d09 0%, #0d0705 100%)' }}>
      
      {/* ── HEADER & NAVIGATION ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-amber-900/40 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <div>
              <h1 className="font-black text-base text-amber-300 leading-tight tracking-wide">
                चाय का चंदा
              </h1>
              <p className="text-[10px] text-amber-500/80 font-medium">
                Desi Nukkad Kiosk • Arc Web3
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newLang = lang === 'hi' ? 'en' : 'hi'
                setLang(newLang)
                speak(newLang === 'hi' ? 'हिंदी भाषा चुनी गई' : 'English language selected')
              }}
              className="px-2.5 py-1 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 transition"
            >
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>

            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 transition"
              title="Toggle Audio"
            >
              {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
      <main className="max-w-xl mx-auto px-4 pt-4">

        {/* ── VILLAGE NUKKAD BANNER ──────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden p-5 mb-5 border border-amber-600/30 shadow-2xl"
             style={{ background: 'linear-gradient(135deg, #421b0e 0%, #260e06 100%)' }}>
          
          <div className="absolute top-2 right-3 flex gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Arc Testnet
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏺</span>
              <h2 className="text-xl font-black text-amber-200 tracking-wide">
                {lang === 'hi' ? 'देशी चाय नुक्कड़' : 'Authentic Desi Nukkad'}
              </h2>
            </div>
            <p className="text-xs text-amber-400/80 mb-4">
              {lang === 'hi' 
                ? 'माटी की खुशबू, शुद्ध गाय का दूध और ब्लॉकचेन की पारदर्शिता' 
                : 'Pure milk, clay kulhad, direct Web3 settlement'}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowRoyaltyConsole(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition flex items-center gap-1 shadow-lg shadow-amber-500/20"
              >
                🔑 {lang === 'hi' ? 'मास्टर की कंसोल' : 'Master Key'}
              </button>
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-950/80 border border-red-500/40 text-red-200 hover:bg-red-900/80 transition"
              >
                🚨 {lang === 'hi' ? 'इमरजेंसी' : 'Emergency'}
              </button>
              <button
                onClick={() => setShowBaithakModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/80 transition"
              >
                🪑 {lang === 'hi' ? 'बैठक बुक' : 'Book Baithak'}
              </button>
              <button
                onClick={() => setShowGiftModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-950/80 border border-purple-500/40 text-purple-200 hover:bg-purple-900/80 transition"
              >
                🎁 {lang === 'hi' ? 'गिफ्ट चाय' : 'Gift Chai'}
              </button>
            </div>
          </div>
        </div>

        {/* ── TAB BAR NAVIGATION ──────────────────────────────────────── */}
        <div className="flex rounded-2xl p-1 bg-amber-950/40 border border-amber-900/40 mb-5">
          {[
            { id: 'order', labelHi: '📜 मेनू व ऑर्डर', labelEn: '📜 Menu & Order' },
            { id: 'hub', labelHi: '📻 ग्लोबल रेडियो', labelEn: '📻 Global Radio' },
            { id: 'perks', labelHi: '🏺 लॉयल्टी पास', labelEn: '🏺 Loyalty Pass' },
            { id: 'vault', labelHi: '📊 तिजोरी', labelEn: '📊 Vault' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-amber-300/70 hover:text-amber-200'
              }`}
            >
              {lang === 'hi' ? tab.labelHi : tab.labelEn}
            </button>
          ))}
        </div>

        {/* ── TAB 1: MENU & ORDER ──────────────────────────────────────── */}
        {activeTab === 'order' && (
          <div className="space-y-4">
            
            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MENU_ITEMS.map((item) => {
                const qty = cart[item.key] || 0
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl p-3.5 border border-amber-900/40 bg-amber-950/20 flex items-center justify-between gap-3 hover:border-amber-700/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-amber-200">
                            {lang === 'hi' ? item.nameHi : item.nameEn}
                          </h3>
                          {item.badgeHi && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {lang === 'hi' ? item.badgeHi : item.badgeEn}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-400/80 font-semibold">{item.price}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-800/40 rounded-xl p-1">
                      <button
                        onClick={() => updateCart(item.key, -1)}
                        className="w-7 h-7 rounded-lg bg-amber-900/40 text-amber-200 font-bold flex items-center justify-center hover:bg-amber-800/60"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-black text-amber-300">{qty}</span>
                      <button
                        onClick={() => updateCart(item.key, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-black font-bold flex items-center justify-center hover:bg-amber-400"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Inputs */}
            <div className="rounded-2xl p-4 border border-amber-900/40 bg-amber-950/20 space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-400 mb-1 block">
                  {lang === 'hi' ? 'आपका नाम (ऐच्छिक)' : 'Your Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा. राम सिंह' : 'e.g. Satoshi'}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-900/50 text-xs text-amber-100 placeholder-amber-800 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-400 mb-1 block">
                  {lang === 'hi' ? 'शुभकामना संदेश / नोट' : 'Custom Note / Message'}
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा. चाय बहुत स्वादिष्ट थी!' : 'e.g. Great chai!'}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-900/50 text-xs text-amber-100 placeholder-amber-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Pay Button & Summary */}
            <div className="rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-r from-amber-950/80 to-stone-950/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-amber-400/80 font-medium">
                  {lang === 'hi' ? 'कुल देय राशि' : 'Total Payable'}
                </p>
                <p className="text-xl font-black text-amber-300">{cartTotal.toFixed(2)} USDC</p>
              </div>

              <button
                onClick={() => handlePayment()}
                disabled={isProcessing || cartTotal <= 0}
                className={`px-6 py-3 rounded-xl font-black text-sm transition shadow-lg ${
                  cartTotal > 0 && !isProcessing
                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
                    : 'bg-amber-950/50 text-amber-700 cursor-not-allowed border border-amber-900/30'
                }`}
              >
                {isProcessing
                  ? (lang === 'hi' ? 'प्रोसेसिंग...' : 'Processing...')
                  : (lang === 'hi' ? '💳 चंदा दें' : '💳 Pay Chanda')}
              </button>
            </div>

          </div>
        )}

        {/* ── TAB 2: GLOBAL RADIO HUB ─────────────────────────────────── */}
        {activeTab === 'hub' && (
          <div className="space-y-4">
            <div className="rounded-3xl p-5 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-purple-950/60 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <Globe size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base text-indigo-200">
                    {lang === 'hi' ? 'ग्लोबल कल्चर रेडियो' : 'Global Culture Radio'}
                  </h3>
                  <p className="text-xs text-indigo-300/70">
                    {lang === 'hi' ? 'चाय की चुस्की के साथ दुनिया के सुर' : 'Worldwide lo-fi vibes at the kiosk'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {GLOBAL_MUSIC_STATIONS.map((st, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-black/40 border border-indigo-900/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-200">{st.country}</p>
                      <p className="text-[10px] text-indigo-400/70">{st.title}</p>
                    </div>
                    <audio controls className="h-8 max-w-[140px] opacity-80" src={st.src} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: LOYALTY PASS ──────────────────────────────────────── */}
        {activeTab === 'perks' && (
          <div className="space-y-4">
            <div className="rounded-3xl p-5 border border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-amber-950/50">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-4xl">🏺</span>
                <div>
                  <h3 className="font-black text-base text-purple-200">
                    {lang === 'hi' ? 'कुल्हड़ NFT लॉयल्टी पास' : 'Kulhad NFT Loyalty Pass'}
                  </h3>
                  <p className="text-xs text-purple-300/70">
                    {lang === 'hi' ? 'हर 5 ऑर्डर पर पाएं 1 फ्री कुल्हड़ चाय' : 'Get 1 Free Chai every 5 orders'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-purple-300">
                  <span>{lang === 'hi' ? 'प्रगति' : 'Progress'}</span>
                  <span>{userOrderCount} / 5</span>
                </div>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-purple-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (userOrderCount / 5) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: VAULT & TREASURY ─────────────────────────────────── */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="rounded-3xl p-5 border border-amber-500/30 bg-black/40 space-y-4">
              <h3 className="font-black text-base text-amber-300">
                📊 {lang === 'hi' ? 'ऑन-चेन तिजोरी एनालिटिक्स' : 'On-Chain Treasury Analytics'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-900/40">
                  <p className="text-[10px] text-amber-400/70 font-bold">{lang === 'hi' ? 'कुल चंदा जमा' : 'Total Collected'}</p>
                  <p className="text-lg font-black text-amber-300">{contractTotal} USDC</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-900/40">
                  <p className="text-[10px] text-amber-400/70 font-bold">{lang === 'hi' ? 'कुल ऑर्डर संख्या' : 'Total Orders'}</p>
                  <p className="text-lg font-black text-amber-300">{contractTipsCount}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-900/30 flex justify-between items-center text-xs text-amber-400/60">
                <span>Contract:</span>
                <a
                  href={`https://explorer.testnet.arc.network/address/${TIPJAR_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-amber-400 hover:underline flex items-center gap-1"
                >
                  0xd385...197 <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── MODALS ────────────────────────────────────────────────────── */}

      {/* Royalty Console Modal */}
      {showRoyaltyConsole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-amber-500/40 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-300 text-sm">🔑 {lang === 'hi' ? 'मास्टर की कंसोल' : 'Master Key Console'}</h3>
              <button onClick={() => setShowRoyaltyConsole(false)} className="text-amber-500 font-bold text-xs">✕</button>
            </div>

            {isOwnerConnected ? (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300">
                ✅ Verified Owner Account
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300">
                ℹ️ View-Only Mode (Connected wallet is not Contract Owner)
              </div>
            )}

            <button
              onClick={() => setShowRoyaltyConsole(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
            >
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Emergency Assist Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-red-950/90 border border-red-500/40 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-red-200 text-sm">🚨 {lang === 'hi' ? 'इमरजेंसी मदद' : 'Emergency Assist'}</h3>
              <button onClick={() => setShowEmergencyModal(false)} className="text-red-400 font-bold text-xs">✕</button>
            </div>
            <p className="text-xs text-red-200/80">
              {lang === 'hi' ? '0.10 USDC का तुरंत माइक्रो-ट्रांजेक्शन करके मदद अलर्ट भेजें।' : 'Send instant help request with 0.10 USDC micro-tx.'}
            </p>
            <button
              onClick={() => {
                setShowEmergencyModal(false)
                handlePayment(0.10, 'EMERGENCY_HELP_REQUEST')
              }}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-500"
            >
              🚨 {lang === 'hi' ? '0.10 USDC मदद भेजें' : 'Send 0.10 USDC Help'}
            </button>
          </div>
        </div>
      )}

      {/* Baithak Modal */}
      {showBaithakModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-emerald-950/90 border border-emerald-500/40 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-200 text-sm">🪑 {lang === 'hi' ? 'बैठक / खाट बुक करें' : 'Reserve Baithak Spot'}</h3>
              <button onClick={() => setShowBaithakModal(false)} className="text-emerald-400 font-bold text-xs">✕</button>
            </div>
            <p className="text-xs text-emerald-200/80">
              {lang === 'hi' ? '0.50 USDC का टोकन अमाउंट देकर अपनी चारपाई रिजर्व करें।' : 'Reserve your spot with 0.50 USDC deposit.'}
            </p>
            <button
              onClick={() => {
                setShowBaithakModal(false)
                handlePayment(0.50, 'BAITHAK_CHARPAI_BOOKING')
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500"
            >
              🪑 {lang === 'hi' ? '0.50 USDC से बुक करें' : 'Reserve with 0.50 USDC'}
            </button>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-purple-950/90 border border-purple-500/40 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-purple-200 text-sm">🎁 {lang === 'hi' ? 'किसी अजनबी को चाय गिफ्ट करें' : 'Gift a Chai'}</h3>
              <button onClick={() => setShowGiftModal(false)} className="text-purple-400 font-bold text-xs">✕</button>
            </div>
            <p className="text-xs text-purple-200/80">
              {lang === 'hi' ? '0.50 USDC फ्री पूल में जोड़ें ताकि कोई ज़रूरतमंद मुफ्त चाय पी सके।' : 'Add 0.50 USDC to the free pool for someone in need.'}
            </p>
            <button
              onClick={() => {
                setShowGiftModal(false)
                handlePayment(0.50, 'GIFT_A_CHAI_POOL')
              }}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-black text-xs hover:bg-purple-500"
            >
              🎁 {lang === 'hi' ? '0.50 USDC पूल में डालें' : 'Add 0.50 USDC to Pool'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
