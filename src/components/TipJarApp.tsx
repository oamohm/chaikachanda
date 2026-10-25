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
} from 'lucide-react'

// ── CONFIGURATION & CONSTANTS ────────────────────────────────────────────────
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

const DESI_MUSIC_STATIONS = [
  { title: '🍵 देसी लो-फाई चाय बीट्स (Desi Lofi)', src: 'https://cdn.pixabay.com/audio/2022/10/31/audio_b5a1d5f9d5.mp3' },
  { title: '🪈 बांसुरी की मधुर धुन (Flute Melody)', src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3' },
  { title: '🌾 ग्रामीण संध्या गूंज (Village Evening)', src: 'https://cdn.pixabay.com/audio/2021/11/25/audio_5358a6a049.mp3' },
]

export default function TipJarApp() {
  const { address, isConnected, chainId } = useAccount()
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
  
  const [contractTotal, setContractTotal] = useState<string>('0.00')
  const [contractTipsCount, setContractTipsCount] = useState<number>(0)
  const [userOrderCount, setUserOrderCount] = useState<number>(2)
  const [selectedMusic, setSelectedMusic] = useState(DESI_MUSIC_STATIONS[0].src)

  // Modals state
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showBaithakModal, setShowBaithakModal] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [showSafeDepositModal, setShowSafeDepositModal] = useState(false)
  
  // Safe Deposit Vault States
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
      console.warn('On-chain read fallback:', err)
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

  const calculateTotal = (): number => {
    return Object.entries(cart).reduce((sum, [key, qty]) => {
      const item = MENU_ITEMS.find((m) => m.key === key)
      return sum + (item ? item.amount * qty : 0)
    }, 0)
  }

  const cartTotal = calculateTotal()

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

  // Safe Kiosk Vault Deposit Handler
  const handleSafeVaultDeposit = async () => {
    const amt = parseFloat(depositAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error(lang === 'hi' ? 'कृपया वैध राशि दर्ज करें' : 'Please enter valid amount')
      return
    }

    if (!isConnected || !walletClient) {
      toast.error(lang === 'hi' ? 'कृपया पहले वॉलेट कनेक्ट करें' : 'Please connect your wallet first')
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

      const generatedId = 'VAULT-CHAI-' + Math.floor(100000 + Math.random() * 900000)
      setVaultTokenId(generatedId)
      toast.success(lang === 'hi' ? 'फंड सुरक्षित जमा हो गया!' : 'Funds securely locked in vault!')
      speak(lang === 'hi' ? 'आपका फंड सुरक्षित जमा हो गया है। यूनिक आईडी मिल गई है।' : 'Funds safely secured in vault.')
    } catch (err: any) {
      console.error(err)
      toast.error(lang === 'hi' ? 'डिपॉजिट असफल रहा' : 'Deposit failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const isOwnerConnected = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase()

  return (
    <div className="min-h-screen w-full text-amber-50 selection:bg-amber-500 selection:text-black font-sans pb-24 px-4 sm:px-6"
         style={{ background: 'linear-gradient(180deg, #180d09 0%, #0d0705 100%)' }}>
      
      {/* ── HEADER & NAVIGATION ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/60 border-b border-amber-900/40 py-3 mb-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">☕</span>
            <div>
              <h1 className="font-black text-lg text-amber-300 leading-tight tracking-wide">
                चाय का चंदा
              </h1>
              <p className="text-xs text-amber-500/80 font-medium">
                Desi Nukkad Kiosk • Arc Web3
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newLang = lang === 'hi' ? 'en' : 'hi'
                setLang(newLang)
                speak(newLang === 'hi' ? 'हिंदी भाषा चुनी गई' : 'English language selected')
              }}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 transition cursor-pointer"
            >
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>

            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-2 rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 transition cursor-pointer"
              title="Toggle Audio"
            >
              {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto space-y-6">

        {/* ── VILLAGE NUKKAD BANNER WITH ATITHI DEVO BHAVA ────────────── */}
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 border border-amber-600/30 shadow-2xl"
             style={{ background: 'linear-gradient(135deg, #421b0e 0%, #260e06 100%)' }}>
          
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Arc Testnet
            </span>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🏺</span>
              <div>
                <h2 className="text-2xl font-black text-amber-200 tracking-wide">
                  {lang === 'hi' ? 'देशी चाय नुक्कड़' : 'Authentic Desi Nukkad'}
                </h2>
                <p className="text-xs font-bold text-amber-400/90 tracking-wider">
                  {lang === 'hi' ? '🙏 अतिथि देव भव • स्वागत है आपका' : '🙏 Atithi Devo Bhava • Welcome'}
                </p>
              </div>
            </div>
            <p className="text-sm text-amber-400/80 max-w-xl">
              {lang === 'hi' 
                ? 'माटी की खुशबू, शुद्ध गाय का दूध और ब्लॉकचेन की पारदर्शिता पर आधारित विकेंद्रीकृत कम्युनिटी स्टॉल।' 
                : 'Pure milk, clay kulhad, and decentralized Web3 settlement for global community inclusion.'}
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={() => setShowSafeDepositModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Lock size={14} /> {lang === 'hi' ? 'सुरक्षित डिपाजिट (Panic Vault)' : 'Safe Vault Deposit'}
              </button>
              <button
                onClick={() => setShowRoyaltyConsole(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Key size={14} /> {lang === 'hi' ? 'मास्टर की कंसोल' : 'Master Key'}
              </button>
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-950/80 border border-red-500/40 text-red-200 hover:bg-red-900/80 transition cursor-pointer"
              >
                🚨 {lang === 'hi' ? 'इमरजेंसी' : 'Emergency'}
              </button>
              <button
                onClick={() => setShowBaithakModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/80 transition cursor-pointer"
              >
                🪑 {lang === 'hi' ? 'बैठक बुक' : 'Book Baithak'}
              </button>
              <button
                onClick={() => setShowGiftModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-950/80 border border-purple-500/40 text-purple-200 hover:bg-purple-900/80 transition cursor-pointer"
              >
                🎁 {lang === 'hi' ? 'गिफ्ट चाय' : 'Gift Chai'}
              </button>
            </div>
          </div>
        </div>

        {/* ── TAB BAR NAVIGATION ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-amber-950/40 p-1.5 rounded-2xl border border-amber-900/40">
          {[
            { id: 'order', labelHi: '📜 मेनू व ऑर्डर', labelEn: '📜 Menu & Order' },
            { id: 'hub', labelHi: '📻 देसी संगीत', labelEn: '📻 Desi Music' },
            { id: 'perks', labelHi: '🏺 लॉयल्टी पास', labelEn: '🏺 Loyalty Pass' },
            { id: 'vault', labelHi: '📊 तिजोरी', labelEn: '📊 Vault' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-sm font-bold rounded-xl transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'text-amber-300/70 hover:text-amber-200'
              }`}
            >
              {lang === 'hi' ? tab.labelHi : tab.labelEn}
            </button>
          ))}
        </div>

        {/* ── TAB 1: MENU & ORDER ──────────────────────────────────────── */}
        {activeTab === 'order' && (
          <div className="space-y-6">
            
            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MENU_ITEMS.map((item) => {
                const qty = cart[item.key] || 0
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl p-4 border border-amber-900/40 bg-amber-950/20 flex items-center justify-between gap-3 hover:border-amber-700/60 transition shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-4xl">{item.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className="font-bold text-sm text-amber-200">
                            {lang === 'hi' ? item.nameHi : item.nameEn}
                          </h3>
                          {item.badgeHi && (
                            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {lang === 'hi' ? item.badgeHi : item.badgeEn}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-400/90 font-bold">{item.price}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-800/40 rounded-xl p-1">
                      <button
                        onClick={() => updateCart(item.key, -1)}
                        className="w-8 h-8 rounded-lg bg-amber-900/40 text-amber-200 font-bold flex items-center justify-center hover:bg-amber-800/60 transition cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-black text-amber-300">{qty}</span>
                      <button
                        onClick={() => updateCart(item.key, 1)}
                        className="w-8 h-8 rounded-lg bg-amber-500 text-black font-bold flex items-center justify-center hover:bg-amber-400 transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Inputs */}
            <div className="rounded-3xl p-5 border border-amber-900/40 bg-amber-950/20 space-y-4">
              <div>
                <label className="text-xs font-bold text-amber-400 mb-1.5 block">
                  {lang === 'hi' ? 'आपका नाम (ऐच्छिक)' : 'Your Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा. राम सिंह' : 'e.g. Satoshi'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-900/50 text-sm text-amber-100 placeholder-amber-800 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-400 mb-1.5 block">
                  {lang === 'hi' ? 'शुभकामना संदेश / नोट' : 'Custom Note / Message'}
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा. चाय बहुत स्वादिष्ट थी!' : 'e.g. Great chai!'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-amber-900/50 text-sm text-amber-100 placeholder-amber-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Pay Button & Summary */}
            <div className="rounded-3xl p-6 border border-amber-500/30 bg-gradient-to-r from-amber-950/80 to-stone-950/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <p className="text-xs text-amber-400/80 font-medium">
                  {lang === 'hi' ? 'कुल देय राशि' : 'Total Payable'}
                </p>
                <p className="text-2xl font-black text-amber-300">{cartTotal.toFixed(2)} USDC</p>
              </div>

              <button
                onClick={() => handlePayment()}
                disabled={isProcessing || cartTotal <= 0}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm transition shadow-lg ${
                  cartTotal > 0 && !isProcessing
                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20 cursor-pointer'
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

        {/* ── TAB 2: DESI MUSIC PLAYER ─────────────────────────────────── */}
        {activeTab === 'hub' && (
          <div className="space-y-6">
            <div className="rounded-3xl p-6 border border-amber-500/30 bg-gradient-to-br from-amber-950/60 to-stone-950/60 space-y-6 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300">
                  <Globe size={28} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-amber-200">
                    {lang === 'hi' ? 'देशी संगीत स्टेशन' : 'Desi Music Station'}
                  </h3>
                  <p className="text-xs text-amber-300/70">
                    {lang === 'hi' ? 'नुक्कड़ पर चाय के साथ हल्की सांस्कृतिक धुनें' : 'Light cultural tunes for the kiosk'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <select
                  value={selectedMusic}
                  onChange={(e) => setSelectedMusic(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-amber-700/50 text-sm font-bold text-amber-200 outline-none cursor-pointer"
                >
                  {DESI_MUSIC_STATIONS.map((st, i) => (
                    <option key={i} value={st.src}>
                      {st.title}
                    </option>
                  ))}
                </select>

                <div className="p-4 rounded-2xl bg-black/40 border border-amber-900/40 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-amber-300">
                    {lang === 'hi' ? 'प्लेयर नियंत्रण' : 'Audio Player'}
                  </span>
                  <audio controls loop className="h-10 w-full max-w-[280px]" src={selectedMusic} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: LOYALTY PASS & REWARDS ────────────────────────────── */}
        {activeTab === 'perks' && (
          <div className="space-y-6">
            <div className="rounded-3xl p-6 border border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-amber-950/50 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl">🏺</span>
                <div>
                  <h3 className="font-black text-lg text-purple-200 mb-1">
                    {lang === 'hi' ? 'कुल्हड़ NFT लॉयल्टी पास' : 'Kulhad NFT Loyalty Pass'}
                  </h3>
                  <p className="text-xs text-purple-300/80">
                    {lang === 'hi' ? 'हर 5 ऑर्डर पर पाएं 1 फ्री कुल्हड़ चाय' : 'Get 1 Free Chai every 5 orders'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-purple-300">
                  <span>{lang === 'hi' ? 'प्रगति स्थिति' : 'Progress Status'}</span>
                  <span>{userOrderCount} / 5</span>
                </div>
                <div className="h-3 rounded-full bg-black/50 overflow-hidden border border-purple-500/30">
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
          <div className="space-y-6">
            <div className="rounded-3xl p-6 border border-amber-500/30 bg-black/40 space-y-6 shadow-xl">
              <h3 className="font-black text-lg text-amber-300">
                📊 {lang === 'hi' ? 'ऑन-चेन तिजोरी एनालिटिक्स' : 'On-Chain Treasury Analytics'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-900/40">
                  <p className="text-xs text-amber-400/70 font-bold mb-1">{lang === 'hi' ? 'कुल चंदा जमा' : 'Total Collected'}</p>
                  <p className="text-2xl font-black text-amber-300">{contractTotal} USDC</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-900/40">
                  <p className="text-xs text-amber-400/70 font-bold mb-1">{lang === 'hi' ? 'कुल ऑर्डर संख्या' : 'Total Orders'}</p>
                  <p className="text-2xl font-black text-amber-300">{contractTipsCount}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-900/30 flex justify-between items-center text-xs text-amber-400/60">
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

      {/* Safe Kiosk Vault / Panic Deposit Modal */}
      {showSafeDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-emerald-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-300 text-base flex items-center gap-2">
                <Lock size={18} /> {lang === 'hi' ? 'सुरक्षित डिपाजिट (Panic Vault)' : 'Safe Vault Deposit'}
              </h3>
              <button onClick={() => setShowSafeDepositModal(false)} className="text-emerald-500 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              {lang === 'hi' 
                ? 'यदि आप अकेले हैं और खतरा महसूस कर रहे हैं, तो अपने फंड को नुक्कड़ के सुरक्षित वाल्ट में जमा करें। आपको एक यूनिक क्लेम आईडी मिलेगी जिससे दुनिया में कहीं भी USDC पा सकते हैं।' 
                : 'Deposit funds securely into the kiosk vault and receive a Unique Claim ID to redeem USDC anywhere.'}
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-emerald-400 mb-1 block">
                  {lang === 'hi' ? 'जमा राशि (USDC)' : 'Deposit Amount (USDC)'}
                </label>
                <input
                  type="text"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-emerald-900 text-sm text-emerald-100 outline-none"
                />
              </div>

              {vaultTokenId && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-1">
                  <p className="text-[10px] text-emerald-400 font-bold">{lang === 'hi' ? 'आपकी यूनिक रिकवरी आईडी:' : 'Your Unique Claim ID:'}</p>
                  <p className="text-sm font-mono font-black text-emerald-200">{vaultTokenId}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSafeVaultDeposit}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer"
              >
                {isProcessing ? (lang === 'hi' ? 'लॉकिंग...' : 'Locking...') : (lang === 'hi' ? '🔒 सुरक्षित लॉक करें' : '🔒 Secure Deposit')}
              </button>
              <button onClick={() => setShowSafeDepositModal(false)} className="px-4 py-3 rounded-xl bg-stone-800 text-stone-300 font-bold text-xs cursor-pointer">
                {lang === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoyaltyConsole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-amber-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-300 text-base">🔑 {lang === 'hi' ? 'मास्टर की कंसोल' : 'Master Key Console'}</h3>
              <button onClick={() => setShowRoyaltyConsole(false)} className="text-amber-500 font-bold text-sm cursor-pointer">✕</button>
            </div>
            {isOwnerConnected ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-medium">
                ✅ Verified Owner Account
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300 font-medium">
                ℹ️ View-Only Mode (Connected wallet is not Contract Owner)
              </div>
            )}
            <button onClick={() => setShowRoyaltyConsole(false)} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-xs cursor-pointer">
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-red-950/90 border border-red-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-red-200 text-base">🚨 {lang === 'hi' ? 'इमरजेंसी मदद' : 'Emergency Assist'}</h3>
              <button onClick={() => setShowEmergencyModal(false)} className="text-red-400 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">
              {lang === 'hi' ? '0.10 USDC का तुरंत माइक्रो-ट्रांजेक्शन करके मदद अलर्ट भेजें।' : 'Send instant help request with 0.10 USDC micro-tx.'}
            </p>
            <button
              onClick={() => { setShowEmergencyModal(false); handlePayment(0.10, 'EMERGENCY_HELP_REQUEST') }}
              className="w-full py-3.5 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-500 transition cursor-pointer"
            >
              🚨 {lang === 'hi' ? '0.10 USDC मदद भेजें' : 'Send 0.10 USDC Help'}
            </button>
          </div>
        </div>
      )}

      {showBaithakModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-emerald-950/90 border border-emerald-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-200 text-base">🪑 {lang === 'hi' ? 'बैठक / खाट बुक करें' : 'Reserve Baithak Spot'}</h3>
              <button onClick={() => setShowBaithakModal(false)} className="text-emerald-400 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              {lang === 'hi' ? '0.50 USDC का टोकन अमाउंट देकर अपनी चारपाई रिजर्व करें।' : 'Reserve your spot with 0.50 USDC deposit.'}
            </p>
            <button
              onClick={() => { setShowBaithakModal(false); handlePayment(0.50, 'BAITHAK_CHARPAI_BOOKING') }}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 transition cursor-pointer"
            >
              🪑 {lang === 'hi' ? '0.50 USDC से बुक करें' : 'Reserve with 0.50 USDC'}
            </button>
          </div>
        </div>
      )}

      {showGiftModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-purple-950/90 border border-purple-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-purple-200 text-base">🎁 {lang === 'hi' ? 'किसी अजनबी को चाय गिफ्ट करें' : 'Gift a Chai'}</h3>
              <button onClick={() => setShowGiftModal(false)} className="text-purple-400 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              {lang === 'hi' ? '0.50 USDC फ्री पूल में जोड़ें ताकि कोई ज़रूरतमंद मुफ्त चाय पी सके।' : 'Add 0.50 USDC to the free pool for someone in need.'}
            </p>
            <button
              onClick={() => { setShowGiftModal(false); handlePayment(0.50, 'GIFT_A_CHAI_POOL') }}
              className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-black text-xs hover:bg-purple-500 transition cursor-pointer"
            >
              🎁 {lang === 'hi' ? '0.50 USDC पूल में डालें' : 'Add 0.50 USDC to Pool'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
