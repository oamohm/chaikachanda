import { useState, useEffect, useCallback } from 'react'
import { useAccount, useBalance, useWalletClient, useSwitchChain } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  type Abi,
  createPublicClient,
  http,
  fallback,
  formatEther,
  parseUnits,
  parseEventLogs,
} from 'viem'
import { toast } from 'sonner'
import { Volume2, VolumeX, Plus, Minus, QrCode, ExternalLink, CheckCircle2, Copy } from 'lucide-react'
import { requireChain, buildTxExplorerUrl, buildAddressExplorerUrl } from '@/onchain-facts'
import { type Lang, loadLang, saveLang } from '@/i18n'
import { useSpeech } from '@/hooks/useSpeech'
import QrScanner, { qrScanSupported } from './QrScanner'
import tipJarArtifact from '../../contracts/out/TipJar.sol/TipJar.json'

// ───────────────────────── Constants ─────────────────────────
const ARC_ID = 5042002
const arcInfo = requireChain(ARC_ID)
const TIPJAR_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197' as `0x${string}`
const TIPJAR_ABI = tipJarArtifact.abi as Abi
const FAUCET_URL = 'https://faucet.circle.com'
const MAIN_RPC = 'https://rpc.testnet.arc.io'
const MIN_TIP = 0.1 // contract minimum, in USDC
const FEE_MARGIN = 0.02 // USDC kept aside for gas
const GOAL_USDC = 10 // "Ketli Meter" goal, display only

const arcViemChain = {
  id: ARC_ID,
  name: arcInfo.name,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [MAIN_RPC] } },
} as const

// Reads go through several official RPCs, so one slow RPC never blocks the page.
const arcPublicClient = createPublicClient({
  chain: arcViemChain,
  transport: fallback(
    arcInfo.rpcUrls.map((u) => http(u, { timeout: 8_000, retryCount: 1 })),
    { rank: false },
  ),
})

// ───────────────────────── Businesses & menus ─────────────────────────
// price in cents of USDC (25 = 0.25 USDC). Only the shown menu changes; the contract is the same.
interface Item { key: string; emoji: string; cents: number; hi: string; en: string }
type BizKey = 'chai' | 'store' | 'freelancer' | 'corporate'

const BUSINESSES: Record<BizKey, { emoji: string; hi: string; en: string; items: Item[] }> = {
  chai: {
    emoji: '☕', hi: 'चाय की टपरी', en: 'Chai Stall',
    items: [
      { key: 'chai', emoji: '🍵', cents: 25, hi: 'कटिंग चाय', en: 'Cutting Chai' },
      { key: 'kulhad', emoji: '🏺', cents: 50, hi: 'कुल्हड़ चाय', en: 'Kulhad Chai' },
      { key: 'masala', emoji: '🫖', cents: 75, hi: 'मसाला चाय', en: 'Masala Chai' },
      { key: 'samosa', emoji: '🥟', cents: 50, hi: 'गरम समोसा', en: 'Hot Samosa' },
      { key: 'kachori', emoji: '🫓', cents: 60, hi: 'खस्ता कचौरी', en: 'Khasta Kachori' },
      { key: 'lassi', emoji: '🥛', cents: 80, hi: 'मलाई लस्सी', en: 'Malai Lassi' },
      { key: 'paratha', emoji: '🫔', cents: 125, hi: 'आलू पराठा', en: 'Aloo Paratha' },
      { key: 'combo', emoji: '🍵🥟', cents: 100, hi: 'चाय + समोसा', en: 'Chai + Samosa' },
      { key: 'special', emoji: '🏺✨', cents: 250, hi: 'कुल्हड़ स्पेशल', en: 'Kulhad Special' },
    ],
  },
  store: {
    emoji: '🛒', hi: 'किराना / जनरल स्टोर', en: 'General Store',
    items: [
      { key: 'atta', emoji: '🌾', cents: 150, hi: 'आटा (1 किलो)', en: 'Atta (1 kg)' },
      { key: 'rice', emoji: '🍚', cents: 200, hi: 'चावल (1 किलो)', en: 'Rice (1 kg)' },
      { key: 'dal', emoji: '🫘', cents: 180, hi: 'दाल (500 ग्राम)', en: 'Dal (500 g)' },
      { key: 'oil', emoji: '🛢️', cents: 300, hi: 'तेल (1 लीटर)', en: 'Oil (1 L)' },
      { key: 'milk', emoji: '🥛', cents: 70, hi: 'दूध (1 लीटर)', en: 'Milk (1 L)' },
      { key: 'biscuit', emoji: '🍪', cents: 40, hi: 'बिस्कुट', en: 'Biscuits' },
    ],
  },
  freelancer: {
    emoji: '💻', hi: 'फ्रीलांसर', en: 'Freelancer',
    items: [
      { key: 'review', emoji: '🔍', cents: 200, hi: 'कोड / डिज़ाइन रिव्यू', en: 'Code / design review' },
      { key: 'call', emoji: '📞', cents: 500, hi: 'सलाह कॉल (30 मिनट)', en: 'Advice call (30 min)' },
      { key: 'logo', emoji: '🎨', cents: 1000, hi: 'लोगो डिज़ाइन', en: 'Logo design' },
      { key: 'page', emoji: '🌐', cents: 2500, hi: 'लैंडिंग पेज', en: 'Landing page' },
      { key: 'coffee', emoji: '☕', cents: 100, hi: 'कॉफी पिलाइए', en: 'Buy me a coffee' },
    ],
  },
  corporate: {
    emoji: '🏢', hi: 'कॉर्पोरेट सेवा', en: 'Corporate Service',
    items: [
      { key: 'consult', emoji: '📊', cents: 1500, hi: 'परामर्श सत्र', en: 'Consulting session' },
      { key: 'audit', emoji: '🧾', cents: 3000, hi: 'ऑडिट रिपोर्ट', en: 'Audit report' },
      { key: 'train', emoji: '🎓', cents: 2000, hi: 'टीम ट्रेनिंग', en: 'Team training' },
      { key: 'support', emoji: '🛠️', cents: 1000, hi: 'मासिक सपोर्ट', en: 'Monthly support' },
    ],
  },
}
const BIZ_KEYS = Object.keys(BUSINESSES) as BizKey[]
type Cart = Record<string, number>

function loadBiz(): BizKey {
  try {
    const v = localStorage.getItem('chayChanda_biz')
    if (v && v in BUSINESSES) return v as BizKey
  } catch { /* storage unavailable */ }
  return 'chai'
}

// ───────────────────────── Text (Hindi / English) ─────────────────────────
const TEXT = {
  hi: {
    title: 'चाय का चंदा',
    bizLabel: 'दुकान का प्रकार',
    rating: 'रेटिंग (स्थायी रिव्यू)',
    ratingHint: 'रेटिंग संदेश के साथ ब्लॉकचेन पर हमेशा के लिए दर्ज होगी',
    navMenu: 'मेन्यू',
    navTip: 'चंदा',
    navWall: 'दीवार',
    navReceipt: 'रसीद',
    tagline: 'अपनी पसंद की चाय का चंदा दीजिए — सीधे ब्लॉकचेन पर',
    total: 'कुल जमा',
    count: 'कुल चंदे',
    ketli: 'केतली मीटर',
    ketliGoal: (g: number) => `आज की केतली का लक्ष्य: ${g} USDC`,
    ketliFull: '🫖 केतली सीटी बजा रही है! लक्ष्य पूरा',
    menu: 'आज का मेन्यू',
    custom: 'या अपनी राशि (USDC)',
    amount: 'आपका चंदा',
    nameLabel: 'नाम या वॉलेट पता (वैकल्पिक)',
    namePh: 'जैसे: अर्जुन — खाली छोड़ें तो आपका पता दिखेगा',
    msgLabel: 'संदेश (वैकल्पिक)',
    msgPh: 'जैसे: चाय बहुत बढ़िया थी',
    scan: 'QR स्कैन',
    scanCancel: 'बंद करें',
    send: 'चंदा भेजें',
    connectFirst: 'पहले वॉलेट कनेक्ट कीजिए',
    wrongNet: 'सही नेटवर्क (Arc Testnet) चुनिए',
    netSwitched: 'नेटवर्क बदल गया — अब फिर से "चंदा भेजें" दबाइए',
    tooLow: `कम से कम ${MIN_TIP} USDC का चंदा चाहिए`,
    noMoney: 'आपके वॉलेट में USDC कम है — फ़ॉसेट से लीजिए',
    faucet: 'फ़ॉसेट से USDC लें',
    sending: 'वॉलेट में पुष्टि कीजिए…',
    confirming: 'ब्लॉकचेन पर पक्का हो रहा है…',
    done: 'चंदा पक्का हो गया! धन्यवाद 🙏',
    doneSpoken: 'चंदा पक्का हो गया। बहुत बहुत धन्यवाद।',
    late: 'अभी पक्का नहीं हुआ — शायद थोड़ी देर लग रही है। नीचे से दोबारा जाँचिए।',
    recheck: 'फिर से जाँचिए',
    again: 'एक और चाय',
    failed: 'लेन-देन विफल हुआ। आपका पैसा नहीं कटा।',
    rejected: 'आपने वॉलेट में मना कर दिया',
    viewTx: 'ब्लॉक एक्सप्लोरर पर देखें',
    wall: 'चंदा देने वाले',
    wallEmpty: 'अभी कोई चंदा नहीं — पहले आप बनिए!',
    listen: 'चायवाले की आवाज़',
    listenNone: 'सुनाने के लिए अभी कोई चंदा नहीं है',
    muted: 'आवाज़ बंद है, इसलिए सुना नहीं सकता',
    receiptTitle: 'रसीद जाँचो',
    receiptHint: 'किसी भी लेन-देन का hash (0x…) डालिए, ऐप ब्लॉकचेन से सच्चाई जाँचेगा',
    receiptBtn: 'जाँचो',
    receiptBad: 'सही hash डालिए (0x से शुरू, 66 अक्षर)',
    receiptNotFound: 'यह लेन-देन नहीं मिला',
    receiptNotTip: 'यह लेन-देन हमारे चाय के चंदे का नहीं है',
    receiptFailedTx: 'यह लेन-देन विफल रहा था',
    receiptOk: '✅ असली चंदा — ब्लॉकचेन पर दर्ज है',
    help: 'वॉलेट अटक रहा है? यहाँ देखिए',
    helpBody: [
      'अपने वॉलेट में Arc Testnet का RPC यह रखिए (पुराना rpc.testnet.arc.network अब नहीं चलता):',
      'MetaMask / Trust / Brave Wallet → Settings → Networks → Arc Testnet → RPC बदलिए।',
      'Brave में साइट पर शेर वाले निशान (Shields) को बंद कीजिए और वॉलेट खोलकर रखिए।',
      'पहले का कोई लेन-देन अटका हो तो वॉलेट के Activity में उसे Cancel या Speed up कीजिए।',
    ],
    copyRpc: 'RPC कॉपी करें',
    copied: 'कॉपी हो गया',
    contract: 'कॉन्ट्रैक्ट देखें',
    mute: 'आवाज़ बंद',
    unmute: 'आवाज़ चालू',
    langSwitched: 'भाषा हिंदी हो गई',
    balance: 'आपका बैलेंस',
    ago: (s: number) => {
      if (s < 60) return 'अभी-अभी'
      if (s < 3600) return `${Math.floor(s / 60)} मिनट पहले`
      if (s < 86400) return `${Math.floor(s / 3600)} घंटे पहले`
      return `${Math.floor(s / 86400)} दिन पहले`
    },
    saidTip: (n: string, a: string, m: string) => `${n} ने ${a} यू एस डी सी का चंदा दिया। संदेश: ${m}`,
    defaultMsg: 'चाय के लिए धन्यवाद',
    from: 'भेजने वाला',
    block: 'ब्लॉक',
    paying: (a: string) => `${a} यू एस डी सी का चंदा भेज रहे हैं`,
  },
  en: {
    title: 'Chai Ka Chanda',
    bizLabel: 'Business type',
    rating: 'Rating (permanent review)',
    ratingHint: 'The rating is stored on the blockchain forever, with your message',
    navMenu: 'Menu',
    navTip: 'Tip',
    navWall: 'Wall',
    navReceipt: 'Receipt',
    tagline: 'Tip your favourite chai — straight on the blockchain',
    total: 'Total collected',
    count: 'Total tips',
    ketli: 'Ketli Meter',
    ketliGoal: (g: number) => `Today’s kettle goal: ${g} USDC`,
    ketliFull: '🫖 The kettle is whistling! Goal reached',
    menu: 'Today’s menu',
    custom: 'Or your own amount (USDC)',
    amount: 'Your tip',
    nameLabel: 'Name or wallet address (optional)',
    namePh: 'e.g. Arjun — leave empty to show your address',
    msgLabel: 'Message (optional)',
    msgPh: 'e.g. The chai was lovely',
    scan: 'Scan QR',
    scanCancel: 'Close',
    send: 'Send tip',
    connectFirst: 'Please connect your wallet first',
    wrongNet: 'Please choose the right network (Arc Testnet)',
    netSwitched: 'Network switched — now press "Send tip" again',
    tooLow: `Minimum tip is ${MIN_TIP} USDC`,
    noMoney: 'Your wallet has too little USDC — get some from the faucet',
    faucet: 'Get USDC from the faucet',
    sending: 'Confirm in your wallet…',
    confirming: 'Confirming on the blockchain…',
    done: 'Tip confirmed! Thank you 🙏',
    doneSpoken: 'Your tip is confirmed. Thank you very much.',
    late: 'Not confirmed yet — it may just be slow. Check again below.',
    recheck: 'Check again',
    again: 'One more chai',
    failed: 'The transaction failed. You were not charged.',
    rejected: 'You rejected it in the wallet',
    viewTx: 'View on block explorer',
    wall: 'Supporters',
    wallEmpty: 'No tips yet — be the first!',
    listen: 'Voice of the Chaiwala',
    listenNone: 'No tips to read out yet',
    muted: 'Sound is muted, so I cannot read it out',
    receiptTitle: 'Check a receipt',
    receiptHint: 'Paste any transaction hash (0x…) — the app verifies it on the blockchain',
    receiptBtn: 'Check',
    receiptBad: 'Enter a valid hash (starts with 0x, 66 characters)',
    receiptNotFound: 'Transaction not found',
    receiptNotTip: 'This transaction is not a tip to our chai stall',
    receiptFailedTx: 'This transaction had failed',
    receiptOk: '✅ Genuine tip — recorded on the blockchain',
    help: 'Wallet stuck? Look here',
    helpBody: [
      'Keep this RPC for Arc Testnet in your wallet (the old rpc.testnet.arc.network no longer works):',
      'MetaMask / Trust / Brave Wallet → Settings → Networks → Arc Testnet → change the RPC.',
      'In Brave, turn off Shields (lion icon) for this site and keep the wallet unlocked.',
      'If an older transaction is stuck, Cancel or Speed up it in the wallet’s Activity.',
    ],
    copyRpc: 'Copy RPC',
    copied: 'Copied',
    contract: 'View contract',
    mute: 'Mute',
    unmute: 'Unmute',
    langSwitched: 'Language set to English',
    balance: 'Your balance',
    ago: (s: number) => {
      if (s < 60) return 'just now'
      if (s < 3600) return `${Math.floor(s / 60)} min ago`
      if (s < 86400) return `${Math.floor(s / 3600)} h ago`
      return `${Math.floor(s / 86400)} d ago`
    },
    saidTip: (n: string, a: string, m: string) => `${n} tipped ${a} U S D C. Message: ${m}`,
    defaultMsg: 'Thanks for the chai',
    from: 'From',
    block: 'Block',
    paying: (a: string) => `Sending a tip of ${a} U S D C`,
  },
}

// ───────────────────────── Helpers ─────────────────────────
interface TipRow {
  tipper: `0x${string}`
  amount: bigint
  name: string
  message: string
  timestamp: bigint
}

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/
const HASH_RE = /^0x[0-9a-fA-F]{64}$/

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}

// The contract limits name/message in BYTES (Hindi letters take 3 bytes each).
function clipBytes(text: string, maxBytes: number): string {
  const enc = new TextEncoder()
  let out = ''
  for (const ch of text) {
    if (enc.encode(out + ch).length > maxBytes) break
    out += ch
  }
  return out
}

function fmtUsdc(raw: bigint | null | undefined): string {
  if (raw == null) return '0.00'
  const n = Number(formatEther(raw))
  return n.toFixed(2)
}

function centsToString(c: number): string {
  return (c / 100).toFixed(2)
}

function errorText(e: unknown, t: typeof TEXT.hi): string {
  const err = e as { code?: number; shortMessage?: string; message?: string } | undefined
  const msg = `${err?.shortMessage ?? ''} ${err?.message ?? ''}`.toLowerCase()
  if (err?.code === 4001 || msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected')) {
    return t.rejected
  }
  if (msg.includes('insufficient')) return t.noMoney
  if (msg.includes('belowminimum') || msg.includes('below minimum')) return t.tooLow
  return t.failed
}

type Step = 'idle' | 'sending' | 'confirming' | 'done' | 'late'

// ───────────────────────── Component ─────────────────────────
export default function ChaiApp() {
  const [lang, setLang] = useState<Lang>(loadLang)
  const t = TEXT[lang]
  const { speak, muted, toggleMute } = useSpeech(lang)

  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const { data: balanceData, refetch: refetchBalance } = useBalance({ address, chainId: ARC_ID })

  const [biz, setBiz] = useState<BizKey>(loadBiz)
  const [stars, setStars] = useState(0)
  const [cart, setCart] = useState<Cart>({})
  const items = BUSINESSES[biz].items
  const [custom, setCustom] = useState('')
  const [nameField, setNameField] = useState('')
  const [message, setMessage] = useState('')
  const [showQr, setShowQr] = useState(false)
  const qrOk = qrScanSupported()

  const [step, setStep] = useState<Step>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [paidAmount, setPaidAmount] = useState('')

  const [total, setTotal] = useState<bigint | null>(null)
  const [count, setCount] = useState<bigint | null>(null)
  const [recent, setRecent] = useState<TipRow[]>([])
  const [readSeq, setReadSeq] = useState(0)

  const [rcHash, setRcHash] = useState('')
  const [rcBusy, setRcBusy] = useState(false)
  const [rcResult, setRcResult] = useState<
    | { kind: 'ok'; row: TipRow; from: `0x${string}`; block: bigint; hash: `0x${string}` }
    | { kind: 'bad'; text: string }
    | null
  >(null)
  const [showHelp, setShowHelp] = useState(false)

  // Say a label out loud, then run the action — used for every button.
  const act = (label: string, fn: () => void | Promise<void>) => () => {
    speak(label)
    void fn()
  }

  // ── Amount ──
  const cartCents = items.reduce((sum, m) => sum + (cart[m.key] ?? 0) * m.cents, 0)
  const customNum = parseFloat(custom.replace(',', '.'))
  const useCustom = custom.trim() !== '' && !Number.isNaN(customNum)
  const amountStr = useCustom ? customNum.toFixed(2) : centsToString(cartCents)
  const amountNum = parseFloat(amountStr)

  const cartLine = items.filter((m) => (cart[m.key] ?? 0) > 0)
    .map((m) => `${cart[m.key]}× ${m[lang]}`)
    .join(', ')

  const adjust = (key: string, delta: number) => {
    setCustom('')
    setCart((prev) => {
      const next = Math.max(0, (prev[key] ?? 0) + delta)
      const copy = { ...prev, [key]: next }
      if (next === 0) delete copy[key]
      return copy
    })
    const item = items.find((m) => m.key === key)
    if (item) speak(item[lang])
  }

  const pickBiz = (b: BizKey) => {
    setBiz(b)
    setCart({})
    setCustom('')
    try { localStorage.setItem('chayChanda_biz', b) } catch { /* ignore */ }
    speak(BUSINESSES[b][lang])
  }

  const goTo = (id: string) => {
    try { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch { /* ignore */ }
  }

  // ── Reading the chain (total, count, supporters) ──
  useEffect(() => {
    let off = false
    const read = async () => {
      try {
        const [tot, cnt] = await Promise.all([
          arcPublicClient.readContract({ address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'totalCollected' }) as Promise<bigint>,
          arcPublicClient.readContract({ address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'getTipsCount' }) as Promise<bigint>,
        ])
        let rows: TipRow[] = []
        if (cnt > 0n) {
          const n = cnt > 10n ? 10n : cnt
          const r = (await arcPublicClient.readContract({
            address: TIPJAR_ADDRESS,
            abi: TIPJAR_ABI,
            functionName: 'getRecentTips',
            args: [n],
          })) as readonly TipRow[]
          rows = [...r].sort((a, b) => Number(b.timestamp - a.timestamp))
        }
        if (!off) {
          setTotal(tot)
          setCount(cnt)
          setRecent(rows)
        }
      } catch {
        // keep showing the last good numbers
      }
    }
    void read()
    const id = setInterval(() => void read(), 5_000)
    return () => {
      off = true
      clearInterval(id)
    }
  }, [readSeq])

  // ── Language / mute ──
  const switchLang = (next: Lang) => {
    setLang(next)
    saveLang(next)
    const msg = TEXT[next].langSwitched
    if (!muted && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(msg)
        u.lang = next === 'hi' ? 'hi-IN' : 'en-IN'
        window.speechSynthesis.speak(u)
      } catch {
        /* stay silent */
      }
    }
  }

  const onMute = () => {
    if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(t.unmute)
        u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
        window.speechSynthesis.speak(u)
      } catch {
        /* stay silent */
      }
    }
    toggleMute()
  }

  // ── Waiting for the receipt (success is shown ONLY after a real receipt) ──
  const waitForReceipt = useCallback(
    async (hash: `0x${string}`) => {
      setStep('confirming')
      try {
        const receipt = await arcPublicClient.waitForTransactionReceipt({
          hash,
          timeout: 60_000,
          pollingInterval: 1_000,
        })
        if (receipt.status === 'success') {
          setStep('done')
          setReadSeq((n) => n + 1)
          void refetchBalance()
          speak(TEXT[lang].doneSpoken)
        } else {
          setStep('idle')
          toast.error(TEXT[lang].failed)
          speak(TEXT[lang].failed)
        }
      } catch {
        setStep('late')
        speak(TEXT[lang].late)
      }
    },
    [lang, speak, refetchBalance],
  )

  // ── Sending the tip ──
  const handleSend = async () => {
    if (!isConnected || !address || !walletClient) {
      toast(t.connectFirst)
      speak(t.connectFirst)
      return
    }
    if (chainId !== ARC_ID) {
      try {
        await switchChainAsync({ chainId: ARC_ID })
        toast.success(t.netSwitched)
        speak(t.netSwitched)
      } catch {
        toast.error(t.wrongNet)
        speak(t.wrongNet)
      }
      return
    }
    if (!(amountNum >= MIN_TIP)) {
      toast.error(t.tooLow)
      speak(t.tooLow)
      return
    }
    if (balanceData && Number(formatEther(balanceData.value)) < amountNum + FEE_MARGIN) {
      toast.error(t.noMoney)
      speak(t.noMoney)
      return
    }

    // Name: typed name, or a scanned/pasted address (shortened), or the sender's own address.
    const raw = nameField.trim()
    const tipName = raw
      ? ADDR_RE.test(raw)
        ? shortAddr(raw)
        : clipBytes(raw, 30)
      : shortAddr(address)
    const body = message.trim() || cartLine || t.defaultMsg
    const tipMessage = clipBytes(stars > 0 ? `⭐${stars} ${body}` : body, 80)

    speak(t.paying(amountStr))
    setStep('sending')
    setPaidAmount(amountStr)
    let hash: `0x${string}`
    try {
      hash = await walletClient.writeContract({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'tip',
        args: [tipName, tipMessage],
        value: parseUnits(amountStr, 18),
        maxFeePerGas: parseUnits('20', 9),
        maxPriorityFeePerGas: parseUnits('2', 9),
      })
    } catch (e) {
      setStep('idle')
      const msg = errorText(e, t)
      toast.error(msg)
      speak(msg)
      return
    }
    setTxHash(hash)
    await waitForReceipt(hash)
  }

  const resetAll = () => {
    setStep('idle')
    setTxHash(null)
    setCart({})
    setCustom('')
    setMessage('')
    setNameField('')
    setStars(0)
  }

  // ── QR ──
  const onQr = (value: string) => {
    setShowQr(false)
    const m = value.match(/0x[0-9a-fA-F]{40}/)
    if (m) setNameField(m[0])
    else setNameField(value.slice(0, 30))
  }

  // ── Voice of the Chaiwala ──
  const listen = () => {
    if (recent.length === 0) {
      toast(t.listenNone)
      speak(t.listenNone)
      return
    }
    if (muted) {
      toast(t.muted)
      return
    }
    const text = recent
      .slice(0, 3)
      .map((r) => t.saidTip(r.name, fmtUsdc(r.amount), r.message))
      .join('. ')
    speak(text)
  }

  // ── Receipt check ──
  const checkReceipt = async () => {
    const h = rcHash.trim()
    if (!HASH_RE.test(h)) {
      setRcResult({ kind: 'bad', text: t.receiptBad })
      return
    }
    setRcBusy(true)
    setRcResult(null)
    try {
      const receipt = await arcPublicClient.getTransactionReceipt({ hash: h as `0x${string}` })
      if (!receipt.to || receipt.to.toLowerCase() !== TIPJAR_ADDRESS.toLowerCase()) {
        setRcResult({ kind: 'bad', text: t.receiptNotTip })
      } else if (receipt.status !== 'success') {
        setRcResult({ kind: 'bad', text: t.receiptFailedTx })
      } else {
        const logs = parseEventLogs({ abi: TIPJAR_ABI, eventName: 'TipReceived', logs: receipt.logs })
        const mine = logs.find((l) => l.address.toLowerCase() === TIPJAR_ADDRESS.toLowerCase())
        if (!mine) {
          setRcResult({ kind: 'bad', text: t.receiptNotTip })
        } else {
          const a = mine.args as unknown as TipRow
          setRcResult({
            kind: 'ok',
            row: { tipper: a.tipper, amount: a.amount, name: a.name, message: a.message, timestamp: a.timestamp },
            from: receipt.from,
            block: receipt.blockNumber,
            hash: receipt.transactionHash,
          })
          speak(t.receiptOk.replace('✅', ''))
        }
      }
    } catch {
      setRcResult({ kind: 'bad', text: t.receiptNotFound })
    }
    setRcBusy(false)
  }

  const copyRpc = async () => {
    try {
      await navigator.clipboard.writeText(MAIN_RPC)
      toast.success(t.copied)
    } catch {
      toast(MAIN_RPC)
    }
  }

  // ── Derived values for display ──
  const nowSec = Math.floor(Date.now() / 1000)
  const totalNum = total != null ? Number(formatEther(total)) : 0
  const ketliPct = Math.min(100, Math.round((totalNum / GOAL_USDC) * 100))
  const walletBalance = balanceData ? Number(formatEther(balanceData.value)).toFixed(2) : null

  // ── Styles ──
  const card: React.CSSProperties = {
    background: '#fffaf3',
    border: '1.5px solid rgba(245,158,11,0.35)',
    borderRadius: 18,
    padding: 16,
    color: '#1c0f07',
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
  }
  const input: React.CSSProperties = {
    width: '100%',
    borderRadius: 12,
    border: '1.5px solid rgba(245,158,11,0.45)',
    padding: '10px 12px',
    fontSize: 15,
    background: '#fff',
    color: '#1c0f07',
  }
  const btn: React.CSSProperties = {
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 700,
    fontSize: 14,
    background: '#fde7c2',
    color: '#7c2d12',
    border: '1px solid rgba(245,158,11,0.5)',
  }
  const btnMain: React.CSSProperties = {
    ...btn,
    width: '100%',
    padding: '14px',
    fontSize: 16,
    background: '#ea580c',
    color: '#fff',
    border: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient, #2c1810)', color: '#fef3c7' }}>
      <div className="mx-auto w-full" style={{ maxWidth: 560, padding: '14px 14px 110px' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: 'wrap' }}>
          <div className="flex items-center" style={{ gap: 6 }}>
            <button
              onClick={() => switchLang('hi')}
              style={{ ...btn, padding: '6px 12px', background: lang === 'hi' ? '#ea580c' : '#fde7c2', color: lang === 'hi' ? '#fff' : '#7c2d12' }}
            >
              हि
            </button>
            <button
              onClick={() => switchLang('en')}
              style={{ ...btn, padding: '6px 12px', background: lang === 'en' ? '#ea580c' : '#fde7c2', color: lang === 'en' ? '#fff' : '#7c2d12' }}
            >
              EN
            </button>
            <button onClick={onMute} aria-label={muted ? t.unmute : t.mute} style={{ ...btn, padding: '7px 10px' }}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', margin: '18px 0 14px' }}>
          <div style={{ fontSize: 40 }}>☕</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fde68a' }}>{t.title}</h1>
          <p style={{ fontSize: 13, opacity: 0.8 }}>{t.tagline}</p>
        </div>

        {/* Totals + Ketli Meter */}
        <div style={{ ...card, marginBottom: 14 }}>
          <div className="flex" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#92400e', fontWeight: 700 }}>{t.total}</p>
              <p style={{ fontSize: 28, fontWeight: 900 }}>{fmtUsdc(total)} <span style={{ fontSize: 14 }}>USDC</span></p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#92400e', fontWeight: 700 }}>{t.count}</p>
              <p style={{ fontSize: 28, fontWeight: 900 }}>{count != null ? count.toString() : '0'}</p>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>🫖 {t.ketli} — {ketliPct}%</p>
            <div style={{ height: 12, borderRadius: 8, background: 'rgba(245,158,11,0.2)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{ width: `${ketliPct}%`, height: '100%', background: 'linear-gradient(90deg,#f59e0b,#ea580c)', transition: 'width 0.6s' }} />
            </div>
            <p style={{ fontSize: 12, marginTop: 4 }}>{ketliPct >= 100 ? t.ketliFull : t.ketliGoal(GOAL_USDC)}</p>
          </div>
        </div>

        {/* Menu */}
        <div id="sec-menu" style={{ ...card, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>{t.bizLabel}</p>
          <div className="flex" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {BIZ_KEYS.map((b) => (
              <button
                key={b}
                onClick={() => pickBiz(b)}
                style={{ ...btn, padding: '6px 10px', fontSize: 12, background: biz === b ? '#ea580c' : '#fde7c2', color: biz === b ? '#fff' : '#7c2d12' }}
              >
                {BUSINESSES[b].emoji} {BUSINESSES[b][lang]}
              </button>
            ))}
          </div>
          <h2 style={{ fontWeight: 800, marginBottom: 8 }}>{BUSINESSES[biz].emoji} {t.menu}</h2>
          <div className="grid" style={{ gap: 8 }}>
            {items.map((m) => {
              const q = cart[m.key] ?? 0
              return (
                <div
                  key={m.key}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: q > 0 ? 'rgba(245,158,11,0.18)' : '#fff',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.emoji} {m[lang]}</div>
                    <div style={{ fontSize: 12, color: '#92400e' }}>{centsToString(m.cents)} USDC</div>
                  </div>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <button onClick={() => adjust(m.key, -1)} aria-label="minus" style={{ ...btn, padding: '6px 8px', opacity: q ? 1 : 0.4 }}>
                      <Minus size={16} />
                    </button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 800 }}>{q}</span>
                    <button onClick={() => adjust(m.key, 1)} aria-label="plus" style={{ ...btn, padding: '6px 8px', background: '#ea580c', color: '#fff' }}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, margin: '12px 0 4px', color: '#92400e' }}>{t.custom}</label>
          <input
            value={custom}
            inputMode="decimal"
            onChange={(e) => setCustom(e.target.value)}
            placeholder="0.50"
            style={input}
          />

          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 900 }}>
            {t.amount}: {amountStr} USDC
          </div>
          {walletBalance != null && (
            <div style={{ fontSize: 12, color: '#92400e' }}>{t.balance}: {walletBalance} USDC</div>
          )}
        </div>

        {/* Name + message + send */}
        <div id="sec-tip" style={{ ...card, marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#92400e' }}>{t.nameLabel}</label>
          <div className="flex" style={{ gap: 8 }}>
            <input value={nameField} onChange={(e) => setNameField(e.target.value)} placeholder={t.namePh} style={input} />
            {qrOk && (
              <button onClick={act(t.scan, () => setShowQr(true))} aria-label={t.scan} style={{ ...btn, padding: '8px 10px' }}>
                <QrCode size={20} />
              </button>
            )}
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, margin: '12px 0 4px', color: '#92400e' }}>{t.msgLabel}</label>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.msgPh} style={input} />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, margin: '12px 0 4px', color: '#92400e' }}>{t.rating}</label>
          <div className="flex" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => { setStars(stars === n ? 0 : n); speak(`${n}`) }}
                aria-label={`${n} star`}
                style={{ fontSize: 28, lineHeight: 1, background: 'none', border: 'none', opacity: n <= stars ? 1 : 0.3, padding: 2 }}
              >
                ⭐
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, marginTop: 2, color: '#92400e' }}>{t.ratingHint}</p>

          <div style={{ marginTop: 14 }}>
            {step === 'idle' && (
              <button onClick={() => void handleSend()} style={btnMain}>
                ☕ {t.send} — {amountStr} USDC
              </button>
            )}
            {step === 'sending' && <div style={{ ...btnMain, textAlign: 'center', opacity: 0.8 }}>⏳ {t.sending}</div>}
            {step === 'confirming' && <div style={{ ...btnMain, textAlign: 'center', opacity: 0.8 }}>⛓️ {t.confirming}</div>}

            {step === 'done' && txHash && (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto' }} />
                <p style={{ fontWeight: 800, marginTop: 6 }}>{t.done}</p>
                <p style={{ fontSize: 13 }}>{paidAmount} USDC</p>
                <a href={buildTxExplorerUrl(ARC_ID, txHash)} target="_blank" rel="noopener noreferrer" style={{ color: '#c2410c', fontWeight: 700, fontSize: 13 }}>
                  <ExternalLink size={14} style={{ display: 'inline', marginRight: 4 }} />{t.viewTx}
                </a>
                <button onClick={act(t.again, resetAll)} style={{ ...btn, width: '100%', marginTop: 10 }}>{t.again}</button>
              </div>
            )}

            {step === 'late' && txHash && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700 }}>{t.late}</p>
                <a href={buildTxExplorerUrl(ARC_ID, txHash)} target="_blank" rel="noopener noreferrer" style={{ color: '#c2410c', fontWeight: 700, fontSize: 13 }}>
                  <ExternalLink size={14} style={{ display: 'inline', marginRight: 4 }} />{t.viewTx}
                </a>
                <button onClick={act(t.recheck, () => waitForReceipt(txHash))} style={{ ...btnMain, marginTop: 10 }}>{t.recheck}</button>
                <button onClick={act(t.again, resetAll)} style={{ ...btn, width: '100%', marginTop: 8 }}>{t.again}</button>
              </div>
            )}
          </div>

          {isConnected && balanceData && Number(formatEther(balanceData.value)) < MIN_TIP + FEE_MARGIN && (
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, color: '#c2410c', fontWeight: 700, fontSize: 13 }}>
              💧 {t.faucet}
            </a>
          )}
        </div>

        {/* Supporters wall */}
        <div id="sec-wall" style={{ ...card, marginBottom: 14 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8, gap: 8 }}>
            <h2 style={{ fontWeight: 800 }}>{t.wall}</h2>
            <button onClick={act(t.listen, listen)} style={{ ...btn, padding: '6px 10px', fontSize: 12 }}>🔊 {t.listen}</button>
          </div>
          {recent.length === 0 ? (
            <p style={{ fontSize: 13 }}>{t.wallEmpty}</p>
          ) : (
            <div className="grid" style={{ gap: 6 }}>
              {recent.map((r, i) => (
                <div key={`${r.timestamp}-${i}`} style={{ padding: '8px 10px', borderRadius: 12, background: '#fff', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <div className="flex justify-between" style={{ gap: 8 }}>
                    <b style={{ wordBreak: 'break-word' }}>{r.name}</b>
                    <b style={{ whiteSpace: 'nowrap' }}>{fmtUsdc(r.amount)} USDC</b>
                  </div>
                  <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{r.message}</div>
                  <div style={{ fontSize: 11, color: '#92400e' }}>{t.ago(Math.max(0, nowSec - Number(r.timestamp)))}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt check */}
        <div id="sec-receipt" style={{ ...card, marginBottom: 14 }}>
          <h2 style={{ fontWeight: 800 }}>🧾 {t.receiptTitle}</h2>
          <p style={{ fontSize: 12, margin: '4px 0 8px' }}>{t.receiptHint}</p>
          <div className="flex" style={{ gap: 8 }}>
            <input value={rcHash} onChange={(e) => setRcHash(e.target.value)} placeholder="0x…" style={input} />
            <button onClick={act(t.receiptBtn, checkReceipt)} disabled={rcBusy} style={{ ...btn, opacity: rcBusy ? 0.6 : 1 }}>
              {t.receiptBtn}
            </button>
          </div>
          {rcResult?.kind === 'bad' && <p style={{ marginTop: 8, color: '#dc2626', fontWeight: 700, fontSize: 13 }}>{rcResult.text}</p>}
          {rcResult?.kind === 'ok' && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <p style={{ color: '#16a34a', fontWeight: 800 }}>{t.receiptOk}</p>
              <p><b>{fmtUsdc(rcResult.row.amount)} USDC</b> — {rcResult.row.name}</p>
              <p style={{ wordBreak: 'break-word' }}>“{rcResult.row.message}”</p>
              <p style={{ fontSize: 12 }}>{t.from}: {shortAddr(rcResult.from)} · {t.block} {rcResult.block.toString()}</p>
              <a href={buildTxExplorerUrl(ARC_ID, rcResult.hash)} target="_blank" rel="noopener noreferrer" style={{ color: '#c2410c', fontWeight: 700 }}>{t.viewTx}</a>
            </div>
          )}
        </div>

        {/* Help */}
        <div style={{ ...card, marginBottom: 14 }}>
          <button onClick={act(t.help, () => setShowHelp((v) => !v))} style={{ ...btn, width: '100%' }}>❓ {t.help}</button>
          {showHelp && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <p>{t.helpBody[0]}</p>
              <p style={{ fontFamily: 'monospace', background: '#fff', borderRadius: 8, padding: 8, margin: '6px 0', wordBreak: 'break-all' }}>{MAIN_RPC}</p>
              <button onClick={() => void copyRpc()} style={{ ...btn, padding: '6px 10px', fontSize: 12 }}>
                <Copy size={14} style={{ display: 'inline', marginRight: 4 }} />{t.copyRpc}
              </button>
              <ul style={{ margin: '10px 0 0 18px', listStyle: 'disc' }}>
                <li>{t.helpBody[1]}</li>
                <li>{t.helpBody[2]}</li>
                <li>{t.helpBody[3]}</li>
              </ul>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, opacity: 0.8 }}>
          <a href={buildAddressExplorerUrl(ARC_ID, TIPJAR_ADDRESS)} target="_blank" rel="noopener noreferrer" style={{ color: '#fde68a' }}>
            {t.contract} ({shortAddr(TIPJAR_ADDRESS)})
          </a>
        </p>
      </div>

      {/* Bottom navigation (leaves room on the right for the Arc Studio badge) */}
      <nav
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '6px 150px 8px 8px', background: 'rgba(28,15,7,0.96)',
          borderTop: '1px solid rgba(245,158,11,0.4)',
        }}
      >
        {([
          ['sec-menu', '🍵', t.navMenu],
          ['sec-tip', '💸', t.navTip],
          ['sec-wall', '🙏', t.navWall],
          ['sec-receipt', '🧾', t.navReceipt],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => { speak(label); goTo(id) }}
            style={{ background: 'none', border: 'none', color: '#fde68a', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '2px 4px' }}
          >
            <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
            {label}
          </button>
        ))}
      </nav>

      {showQr && <QrScanner onResult={onQr} onClose={() => setShowQr(false)} cancelLabel={t.scanCancel} />}
    </div>
  )
}
