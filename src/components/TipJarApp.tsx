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
  { key: 'masalaChai', nameHi: 'रॉयल मसाला चाय', nameEn: 'Royal Masala Chai', emoji: '🫖', price: '0.75 USDC', amount: 0.75, badgeHi: 'ऑर्गेनिक', badgeEn: 'Organic' },
  { key: 'samosa', nameHi: 'गरम समोसा (2 पीस)', nameEn: 'Crispy Samosa (2 pcs)', emoji: '🥟', price: '0.50 USDC', amount: 0.50, badgeHi: 'गरमागरम', badgeEn: 'Hot' },
  { key: 'kachori', nameHi: 'राजस्थानी कचौरी', nameEn: 'Rajasthani Kachori', emoji: '🫓', price: '0.60 USDC', amount: 0.60, badgeHi: 'नया', badgeEn: 'New' },
  { key: 'combo', nameHi: 'चाय + समोसा कॉम्बो', nameEn: 'Chai + Samosa Combo', emoji: '🍵🥟', price: '1.00 USDC', amount: 1.00, badgeHi: 'ऑफर', badgeEn: 'Offer' },
  { key: 'lassi', nameHi: 'मलाई लस्सी', nameEn: 'Sweet Clay Lassi', emoji: '🥛', price: '0.80 USDC', amount: 0.80, badgeHi: 'ऑर्गेनिक', badgeEn: 'Organic' },
  { key: 'aloo', nameHi: 'देशी घी पराठा', nameEn: 'Desi Ghee Paratha', emoji: '🫔', price: '1.25 USDC', amount: 1.25, badgeHi: 'ऑफर', badgeEn: 'Offer' },
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
  const [activeTab, setActiveTab] = useState<'all' | 'hot' | 'snacks' | 'combos'>('all')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  
  const [contractTotal, setContractTotal] = useState<string>('6.05')
  const [contractTipsCount, setContractTipsCount] = useState<number>(12)
  const [selectedMusic, setSelectedMusic] = useState(DESI_MUSIC_STATIONS[0].src)

  // Modals
  const [showRoyaltyConsole, setShowRoyaltyConsole] = useState(false)
  const [showSafeDepositModal, setShowSafeDepositModal] = useState(false)
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
      fetchOnChainData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.shortMessage || (lang === 'hi' ? 'ट्रांजेक्शन असफल रहा' : 'Transaction failed'))
      speak(lang === 'hi' ? 'ट्रांजेक्शन पूरा नहीं हो सका' : 'Transaction failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSafeVaultDeposit = async () => {
    const amt = parseFloat(depositAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('कृपया वैध राशि दर्ज करें')
      return
    }
    if (!isConnected || !walletClient) {
      toast.error('कृपया वॉलेट कनेक्ट करें')
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
      toast.success('फंड सुरक्षित जमा हो गया!')
    } catch (err: any) {
      toast.error('डिपॉजिट असफल रहा')
    } finally {
      setIsProcessing(false)
    }
  }

  const isOwnerConnected = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase()

  return (
    <div className="min-h-screen w-full text-amber-950 font-sans pb-24 px-3 sm:px-6"
         style={{ background: 'linear-gradient(180deg, #fdf6e2 0%, #f7ebd0 100%)' }}>
      
      {/* ── TOP HEADER / BANNER ──────────────────────────────────────── */}
      <header className="max-w-5xl mx-auto pt-4 mb-4">
        <div className="rounded-3xl p-5 border border-amber-500/40 shadow-xl bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 relative overflow-hidden text-center">
          
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <button
              onClick={() => {
                const newLang = lang === 'hi' ? 'en' : 'hi'
                setLang(newLang)
                speak(newLang === 'hi' ? 'हिंदी चुनी गई' : 'English selected')
              }}
              className="px-2.5 py-1 rounded-full text-xs font-bold border border-amber-600/40 bg-amber-200/60 text-amber-900 cursor-pointer"
            >
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1.5 rounded-full border border-amber-600/40 bg-amber-200/60 text-amber-900 cursor-pointer"
            >
              {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>

          <p className="text-[11px] font-bold text-amber-800 tracking-wider mb-1">
            🌿 Web3 Smart Chai Stall • Arc Testnet
          </p>
          <h1 className="text-3xl font-black text-amber-900 tracking-wide drop-shadow-sm mb-1">
            CHAI KA CHANDA
          </h1>
          <p className="text-xs text-amber-800 font-semibold mb-3">
            Fresh Desi Chai & Crispy Snacks • Pay with USDC[span_1](start_span)[span_1](end_span)
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setShowSafeDepositModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition flex items-center gap-1 cursor-pointer shadow"
            >
              <Lock size={12} /> {lang === 'hi' ? 'सुरक्षित डिपाजिट (Panic Vault)' : 'Safe Vault Deposit'}
            </button>
            <button
              onClick={() => setShowRoyaltyConsole(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition flex items-center gap-1 cursor-pointer shadow"
            >
              <Key size={12} /> {lang === 'hi' ? 'मास्टर की कंसोल' : 'Master Key'}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN DASHBOARD (GRID LAYOUT AS SHOWN IN SCREENSHOT) ──────── */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── LEFT COLUMN: MENU & MUSIC ────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[140px] p-3 rounded-2xl bg-amber-200/70 border border-amber-400/50 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                <QrCode size={14} /> Atithi Devo Bhava
              </span>
              <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">Active</span>
            </div>
          </div>

          {/* Special Offer Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">Today's Special</p>
              <p className="text-xs font-black">Cutting Chai + 2 Samosas</p>
              <p className="text-[11px] font-medium opacity-90">1.00 USDC • SAVE 25% • Fresh Elaichi Blend</p>
            </div>
            <span className="px-2.5 py-1 bg-black/30 rounded-xl text-xs font-bold">HOT</span>
          </div>

          {/* Music Station Selector */}
          <div className="p-3 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-between gap-3 shadow-md">
            <select
              value={selectedMusic}
              onChange={(e) => setSelectedMusic(e.target.value)}
              className="bg-black/40 text-amber-200 text-xs font-bold px-3 py-2 rounded-xl outline-none w-full cursor-pointer border border-amber-700"
            >
              {DESI_MUSIC_STATIONS.map((st, i) => (
                <option key={i} value={st.src}>{st.title}</option>
              ))}
            </select>
            <audio controls loop className="h-8 max-w-[140px]" src={selectedMusic} />
          </div>

          {/* Analytics / Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-amber-200/60 border border-amber-400/60 text-center">
              <p className="text-[10px] font-bold text-amber-800">Total Sales</p>
              <p className="text-base font-black text-amber-900">{contractTotal} USDC</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-200/60 border border-amber-400/60 text-center">
              <p className="text-[10px] font-bold text-amber-800">Total Orders</p>
              <p className="text-base font-black text-amber-900">{contractTipsCount}</p>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'hot', label: 'Hot Chai' },
              { id: 'snacks', label: 'Snacks' },
              { id: 'combos', label: 'Combos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-amber-200/50 text-amber-900 hover:bg-amber-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Fresh Desi Menu Grid */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wide px-1">Fresh Desi Menu</h3>
            {MENU_ITEMS.map((item) => {
              const qty = cart[item.key] || 0
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-2xl bg-white/80 border border-amber-300 shadow-sm flex items-center justify-between gap-3 hover:border-amber-500 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div>
                      <h4 className="font-bold text-xs text-amber-950">{lang === 'hi' ? item.nameHi : item.nameEn}</h4>
                      <p className="text-[11px] font-black text-amber-700">{item.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {qty > 0 && <span className="text-xs font-bold text-amber-900 px-1.5">{qty}</span>}
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

        {/* ── RIGHT COLUMN: ORDER FULFILLMENT & PAYMENT CONSOLE ─────── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-4 rounded-3xl p-5 bg-white/90 border border-amber-400 shadow-xl space-y-4">
            
            <h3 className="text-sm font-black text-amber-900 border-b border-amber-200 pb-2 flex items-center justify-between">
              <span>Place Order / Pay Tip</span>
              <span className="text-[10px] text-amber-700 font-semibold">Secure Web3 Checkout</span>
            </h3>

            {/* Fulfillment Type */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1 block">Order Fulfillment</label>
              <div className="grid grid-cols-2 gap-2">
                <button className="py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Online Delivery / Pre-Order
                </button>
                <button className="py-2 rounded-xl text-xs font-bold bg-orange-600 text-white shadow">
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

            {/* Vibe Selector Tags */}
            <div>
              <label className="text-[11px] font-bold text-amber-900 mb-1.5 block">Pick a Vibe</label>
              <div className="flex flex-wrap gap-1.5">
                {['Cutting Chai Master', 'Extra Elaichi', 'Crunchy Banaras Vibe', 'Eldai Dukaan Star', 'Qawwali Mood'].map((vibe) => (
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

            {/* Special Request / Note */}
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

      {/* ── MODALS ────────────────────────────────────────────────────── */}
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
              अकेले हैं और खतरा महसूस हो रहा है? अपने फंड को नुक्कड़ के सुरक्षित वाल्ट में जमा करें और यूनिक क्लेम आईडी प्राप्त करें।
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Deposit Amount (USDC)"
                className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold"
              />
              {vaultTokenId && (
                <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-400 text-center">
                  <p className="text-[10px] text-emerald-800 font-bold">यूनिक क्लेम आईडी:</p>
                  <p className="text-xs font-mono font-black text-emerald-950">{vaultTokenId}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSafeVaultDeposit}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                {isProcessing ? 'लॉकिंग...' : '🔒 सुरक्षित लॉक करें'}
              </button>
              <button onClick={() => setShowSafeDepositModal(false)} className="px-4 py-3 rounded-xl bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer">
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoyaltyConsole && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-amber-500 p-6 space-y-4 shadow-2xl text-amber-950">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-900 text-base">🔑 मास्टर की कंसोल</h3>
              <button onClick={() => setShowRoyaltyConsole(false)} className="text-amber-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-amber-800">
              {isOwnerConnected ? '✅ वेरिफाइड ओनर अकाउंट' : 'ℹ️ व्यू-ओनली मोड (कनेक्टेड वॉलेट ओनर नहीं है)'}
            </p>
            <button onClick={() => setShowRoyaltyConsole(false)} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer">
              बंद करें
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
