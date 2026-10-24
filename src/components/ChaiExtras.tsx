/**
 * ChaiExtras — add-on pieces for Chai Ka Chanda. Nothing here removes or replaces an existing
 * feature; TipJarApp imports these and places them next to what was already there.
 *   BizSwitcher  – choose the kind of shop (chai stall / general store / freelancer / corporate)
 *   StarRating   – 1-5 stars saved inside the on-chain message (a permanent review)
 *   ChaiExtras   – Ketli Meter, Voice of the Chaiwala, Receipt Checker, Wallet-help panel
 *   BottomNav    – mobile bottom navigation
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createPublicClient, http, fallback, formatEther, parseEventLogs, type Abi } from 'viem'
import { toast } from 'sonner'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'
import type { Lang } from '@/i18n'
import tipJarArtifact from '../../contracts/out/TipJar.sol/TipJar.json'

const ARC_ID = 5042002
const TIPJAR_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197' as `0x${string}`
const TIPJAR_ABI = tipJarArtifact.abi as Abi
const MAIN_RPC = 'https://rpc.testnet.arc.io'
const GOAL_USDC = 10 // Ketli Meter goal (display only; the collected amount is real)

const arcInfo = requireChain(ARC_ID)
const client = createPublicClient({
  chain: {
    id: ARC_ID,
    name: arcInfo.name,
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [MAIN_RPC] } },
  },
  transport: fallback(arcInfo.rpcUrls.map((u) => http(u, { timeout: 8_000, retryCount: 1 })), { rank: false }),
})

// ───────── helpers ─────────
export type BizKey = 'chai' | 'store' | 'freelancer' | 'corporate'
export const BIZ_KEYS: BizKey[] = ['chai', 'store', 'freelancer', 'corporate']
export const BIZ_META: Record<BizKey, { emoji: string; hi: string; en: string }> = {
  chai: { emoji: '☕', hi: 'चाय की टपरी', en: 'Chai Stall' },
  store: { emoji: '🛒', hi: 'किराना / जनरल स्टोर', en: 'General Store' },
  freelancer: { emoji: '💻', hi: 'फ्रीलांसर', en: 'Freelancer' },
  corporate: { emoji: '🏢', hi: 'कॉर्पोरेट सेवा', en: 'Corporate Service' },
}

export function loadBiz(): BizKey {
  try {
    const v = localStorage.getItem('chayChanda_biz')
    if (v && (BIZ_KEYS as string[]).includes(v)) return v as BizKey
  } catch { /* storage unavailable */ }
  return 'chai'
}
export function saveBiz(b: BizKey): void {
  try { localStorage.setItem('chayChanda_biz', b) } catch { /* ignore */ }
}

// The contract limits name/message in BYTES (a Hindi letter is 3 bytes), so cut by bytes, not characters.
export function clipBytes(text: string, maxBytes: number): string {
  const enc = new TextEncoder()
  let out = ''
  for (const ch of text) {
    if (enc.encode(out + ch).length > maxBytes) break
    out += ch
  }
  return out
}

const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)
const fmt = (raw: bigint) => Number(formatEther(raw)).toFixed(2)
const HASH_RE = /^0x[0-9a-fA-F]{64}$/

interface TipRow { tipper: `0x${string}`; amount: bigint; name: string; message: string; timestamp: bigint }

const T = {
  hi: {
    bizLabel: 'दुकान का प्रकार',
    rating: '⭐ रेटिंग (स्थायी रिव्यू)',
    ratingHint: 'रेटिंग संदेश के साथ ब्लॉकचेन पर हमेशा के लिए दर्ज होगी',
    ketli: '🫖 केतली मीटर',
    ketliGoal: `आज की केतली का लक्ष्य: ${GOAL_USDC} USDC`,
    ketliFull: '🫖 केतली सीटी बजा रही है! लक्ष्य पूरा',
    listen: '🔊 चायवाले की आवाज़',
    listenHint: 'आख़िरी तीन चंदे बोलकर सुनाए जाएँगे',
    listenNone: 'सुनाने के लिए अभी कोई चंदा नहीं है',
    muted: 'आवाज़ बंद है, इसलिए सुना नहीं सकता',
    saidTip: (n: string, a: string, m: string) => `${n} ने ${a} यू एस डी सी का चंदा दिया। संदेश: ${m}`,
    receipt: '🧾 रसीद जाँचो',
    receiptHint: 'किसी भी लेन-देन का hash (0x…) डालिए, ऐप ब्लॉकचेन से सच्चाई जाँचेगा',
    check: 'जाँचो',
    bad: 'सही hash डालिए (0x से शुरू, 66 अक्षर)',
    notFound: 'यह लेन-देन नहीं मिला',
    notTip: 'यह लेन-देन हमारे चाय के चंदे का नहीं है',
    failedTx: 'यह लेन-देन विफल रहा था',
    ok: '✅ असली चंदा — ब्लॉकचेन पर दर्ज है',
    from: 'भेजने वाला',
    block: 'ब्लॉक',
    view: 'ब्लॉक एक्सप्लोरर पर देखें',
    help: '❓ वॉलेट अटक रहा है? यहाँ देखिए',
    helpBody: [
      'अपने वॉलेट में Arc Testnet का RPC यह रखिए (पुराना rpc.testnet.arc.network अब नहीं चलता):',
      'MetaMask / Trust / Brave Wallet → Settings → Networks → Arc Testnet → RPC बदलिए।',
      'Brave में साइट पर शेर वाले निशान (Shields) को बंद कीजिए और वॉलेट खोलकर रखिए।',
      'पहले का कोई लेन-देन अटका हो तो वॉलेट के Activity में उसे Cancel या Speed up कीजिए।',
    ],
    copyRpc: 'RPC कॉपी करें',
    copied: 'कॉपी हो गया',
    navTop: 'ऊपर',
    navMenu: 'मेन्यू',
    navExtras: 'और',
    navReceipt: 'रसीद',
  },
  en: {
    bizLabel: 'Business type',
    rating: '⭐ Rating (permanent review)',
    ratingHint: 'The rating is stored on the blockchain forever, with your message',
    ketli: '🫖 Ketli Meter',
    ketliGoal: `Today’s kettle goal: ${GOAL_USDC} USDC`,
    ketliFull: '🫖 The kettle is whistling! Goal reached',
    listen: '🔊 Voice of the Chaiwala',
    listenHint: 'Reads out the last three tips',
    listenNone: 'No tips to read out yet',
    muted: 'Sound is muted, so I cannot read it out',
    saidTip: (n: string, a: string, m: string) => `${n} tipped ${a} U S D C. Message: ${m}`,
    receipt: '🧾 Check a receipt',
    receiptHint: 'Paste any transaction hash (0x…) — the app verifies it on the blockchain',
    check: 'Check',
    bad: 'Enter a valid hash (starts with 0x, 66 characters)',
    notFound: 'Transaction not found',
    notTip: 'This transaction is not a tip to our chai stall',
    failedTx: 'This transaction had failed',
    ok: '✅ Genuine tip — recorded on the blockchain',
    from: 'From',
    block: 'Block',
    view: 'View on block explorer',
    help: '❓ Wallet stuck? Look here',
    helpBody: [
      'Keep this RPC for Arc Testnet in your wallet (the old rpc.testnet.arc.network no longer works):',
      'MetaMask / Trust / Brave Wallet → Settings → Networks → Arc Testnet → change the RPC.',
      'In Brave, turn off Shields (lion icon) for this site and keep the wallet unlocked.',
      'If an older transaction is stuck, Cancel or Speed up it in the wallet’s Activity.',
    ],
    copyRpc: 'Copy RPC',
    copied: 'Copied',
    navTop: 'Top',
    navMenu: 'Menu',
    navExtras: 'More',
    navReceipt: 'Receipt',
  },
}

const darkCard: React.CSSProperties = {
  background: 'linear-gradient(160deg,#1c1917,#292524)',
  border: '2px solid rgba(251,191,36,0.35)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  borderRadius: 16,
  padding: 16,
  color: '#fef3c7',
}
const chip: React.CSSProperties = {
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 700,
  border: '1.5px solid rgba(251,191,36,0.5)',
}
const lightInput: React.CSSProperties = {
  width: '100%',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 13,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#fef3c7',
}

// ───────── Business switcher ─────────
export function BizSwitcher({ biz, onPick, lang }: { biz: BizKey; onPick: (b: BizKey) => void; lang: Lang }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(254,243,199,0.55)', marginBottom: 6 }}>
        {T[lang].bizLabel}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BIZ_KEYS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onPick(b)}
            style={{ ...chip, background: biz === b ? '#ea580c' : 'rgba(255,255,255,0.06)', color: biz === b ? '#fff' : '#fde68a' }}
          >
            {BIZ_META[b].emoji} {BIZ_META[b][lang]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ───────── Star rating (stored in the on-chain message) ─────────
export function StarRating({ stars, onChange, lang }: { stars: number; onChange: (n: number) => void; lang: Lang }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(254,243,199,0.55)', marginBottom: 4 }}>
        {T[lang].rating}
      </p>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(stars === n ? 0 : n)}
            aria-label={`${n} star`}
            style={{ fontSize: 28, lineHeight: 1, background: 'none', border: 'none', padding: 2, opacity: n <= stars ? 1 : 0.3 }}
          >
            ⭐
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(254,243,199,0.5)' }}>{T[lang].ratingHint}</p>
    </div>
  )
}

// ───────── Ketli Meter + Voice + Receipt + Help ─────────
export function ChaiExtras({
  lang, total, speak, muted,
}: { lang: Lang; total: bigint | null; speak: (text: string) => void; muted: boolean }) {
  const t = T[lang]
  const totalNum = total != null ? Number(formatEther(total)) : 0
  const pct = Math.min(100, Math.round((totalNum / GOAL_USDC) * 100))

  const [rcHash, setRcHash] = useState('')
  const [rcBusy, setRcBusy] = useState(false)
  const [rc, setRc] = useState<
    | { kind: 'ok'; row: TipRow; from: `0x${string}`; block: bigint; hash: `0x${string}` }
    | { kind: 'bad'; text: string }
    | null
  >(null)
  const [showHelp, setShowHelp] = useState(false)

  const listen = async () => {
    speak(t.listen.replace('🔊 ', ''))
    try {
      const cnt = (await client.readContract({ address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'getTipsCount' })) as bigint
      if (cnt === 0n) { toast(t.listenNone); speak(t.listenNone); return }
      if (muted) { toast(t.muted); return }
      const n = cnt > 3n ? 3n : cnt
      const rows = [
        ...((await client.readContract({
          address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'getRecentTips', args: [n],
        })) as readonly TipRow[]),
      ].sort((a, b) => Number(b.timestamp - a.timestamp))
      speak(rows.map((r) => t.saidTip(r.name, fmt(r.amount), r.message)).join('. '))
    } catch {
      toast.error(t.notFound)
    }
  }

  const check = async () => {
    const h = rcHash.trim()
    if (!HASH_RE.test(h)) { setRc({ kind: 'bad', text: t.bad }); return }
    setRcBusy(true); setRc(null)
    try {
      const receipt = await client.getTransactionReceipt({ hash: h as `0x${string}` })
      if (!receipt.to || receipt.to.toLowerCase() !== TIPJAR_ADDRESS.toLowerCase()) {
        setRc({ kind: 'bad', text: t.notTip })
      } else if (receipt.status !== 'success') {
        setRc({ kind: 'bad', text: t.failedTx })
      } else {
        const logs = parseEventLogs({ abi: TIPJAR_ABI, eventName: 'TipReceived', logs: receipt.logs })
        const mine = logs.find((l) => l.address.toLowerCase() === TIPJAR_ADDRESS.toLowerCase())
        if (!mine) {
          setRc({ kind: 'bad', text: t.notTip })
        } else {
          const a = mine.args as unknown as TipRow
          setRc({ kind: 'ok', row: a, from: receipt.from, block: receipt.blockNumber, hash: receipt.transactionHash })
          speak(t.ok.replace('✅', ''))
        }
      }
    } catch {
      setRc({ kind: 'bad', text: t.notFound })
    }
    setRcBusy(false)
  }

  const copyRpc = async () => {
    try { await navigator.clipboard.writeText(MAIN_RPC); toast.success(t.copied) } catch { toast(MAIN_RPC) }
  }

  const btn: React.CSSProperties = { ...chip, background: 'rgba(255,255,255,0.08)', color: '#fde68a' }

  return (
    <div id="sec-extras" style={{ display: 'grid', gap: 12 }}>
      {/* Ketli Meter */}
      <div style={darkCard}>
        <p style={{ fontWeight: 800 }}>{t.ketli} — {pct}%</p>
        <div style={{ height: 12, borderRadius: 8, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', margin: '8px 0' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#f59e0b,#ea580c)', transition: 'width 0.6s' }} />
        </div>
        <p style={{ fontSize: 12, opacity: 0.85 }}>{pct >= 100 ? t.ketliFull : t.ketliGoal}</p>
      </div>

      {/* Voice of the Chaiwala */}
      <div style={darkCard}>
        <button type="button" onClick={() => void listen()} style={{ ...btn, width: '100%', padding: '10px 12px', fontSize: 14 }}>
          {t.listen}
        </button>
        <p style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>{t.listenHint}</p>
      </div>

      {/* Receipt checker */}
      <div id="sec-receipt" style={darkCard}>
        <p style={{ fontWeight: 800 }}>{t.receipt}</p>
        <p style={{ fontSize: 11, margin: '4px 0 8px', opacity: 0.75 }}>{t.receiptHint}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={rcHash} onChange={(e) => setRcHash(e.target.value)} placeholder="0x…" style={lightInput} />
          <button type="button" onClick={() => { speak(t.check); void check() }} disabled={rcBusy} style={{ ...btn, opacity: rcBusy ? 0.6 : 1 }}>
            {t.check}
          </button>
        </div>
        {rc?.kind === 'bad' && <p style={{ marginTop: 8, color: '#fca5a5', fontWeight: 700, fontSize: 13 }}>{rc.text}</p>}
        {rc?.kind === 'ok' && (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <p style={{ color: '#86efac', fontWeight: 800 }}>{t.ok}</p>
            <p><b>{fmt(rc.row.amount)} USDC</b> — {rc.row.name}</p>
            <p style={{ wordBreak: 'break-word' }}>“{rc.row.message}”</p>
            <p style={{ fontSize: 12, opacity: 0.8 }}>{t.from}: {shortAddr(rc.from)} · {t.block} {rc.block.toString()}</p>
            <a href={buildTxExplorerUrl(ARC_ID, rc.hash)} target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24', fontWeight: 700 }}>{t.view}</a>
          </div>
        )}
      </div>

      {/* Wallet help */}
      <div style={darkCard}>
        <button type="button" onClick={() => { speak(t.help.replace('❓ ', '')); setShowHelp((v) => !v) }} style={{ ...btn, width: '100%', padding: '10px 12px', fontSize: 14 }}>
          {t.help}
        </button>
        {showHelp && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <p>{t.helpBody[0]}</p>
            <p style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 8, margin: '6px 0', wordBreak: 'break-all' }}>{MAIN_RPC}</p>
            <button type="button" onClick={() => void copyRpc()} style={{ ...btn, fontSize: 12 }}>{t.copyRpc}</button>
            <ul style={{ margin: '10px 0 0 18px', listStyle: 'disc' }}>
              <li>{t.helpBody[1]}</li>
              <li>{t.helpBody[2]}</li>
              <li>{t.helpBody[3]}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ───────── Mobile bottom navigation ─────────
export function BottomNav({ lang, speak }: { lang: Lang; speak: (text: string) => void }) {
  const t = T[lang]
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  if (!ready || typeof document === 'undefined') return null

  const go = (id: string | null, label: string) => {
    speak(label)
    try {
      if (id === null) window.scrollTo({ top: 0, behavior: 'smooth' })
      else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch { /* ignore */ }
  }

  const items: [string | null, string, string][] = [
    [null, '🏠', t.navTop],
    ['sec-menu', '🍵', t.navMenu],
    ['sec-extras', '✨', t.navExtras],
    ['sec-receipt', '🧾', t.navReceipt],
  ]

  // Rendered in <body> through a portal, so no parent style can break its fixed position.
  // The right side is left free for the "Built with Arc Studio" badge.
  return createPortal(
    <nav
      className="md:hidden"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '6px 150px 8px 8px', background: 'rgba(28,15,7,0.96)',
        borderTop: '1px solid rgba(245,158,11,0.4)',
      }}
    >
      {items.map(([id, icon, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => go(id, label)}
          style={{ background: 'none', border: 'none', color: '#fde68a', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '2px 4px' }}
        >
          <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
          {label}
        </button>
      ))}
    </nav>,
    document.body,
  )
}
