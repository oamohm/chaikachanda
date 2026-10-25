import { Component, useState, useEffect, useRef, useCallback } from 'react'
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useWalletClient,
  usePublicClient,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { type Abi, formatEther, parseUnits, createPublicClient, http } from 'viem'
import { Amount } from '@/onchain-money'
import { TokenUSDC } from '@web3icons/react'
import { ChainID, requireChain } from '@/onchain-facts'
import { requireToken, TokenID } from '@/onchain-facts'
import { toast } from 'sonner'
import {
  Coffee,
  Heart,
  ArrowDownToLine,
  Users,
  TrendingUp,
  Globe,
  Award,
  BookOpenText,
  ShieldCheck,
  ChevronDown,
  Plus,
  Minus,
  ShoppingCart,
  Bike,
  Volume2,
  VolumeX,
} from 'lucide-react'

// Authentic Nukkad Style Icons and Textures
const kalamkariPattern = 'linear-gradient(90deg, #A26B43 0%, #D48E59 33%, #905D3D 66%, #A26B43 100%)' // Stylized copper kalamkari
const mudWallTexture = 'linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 100%), linear-gradient(#222 0%, #333 100%)' // Dark Mud wall texture

// --- Configuration ---
const ARC_TESTNET_CHAIN_ID = 5042002
const ARC_RPC = 'https://rpc.testnet.arc.network'
const TIPJAR_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197'
const PERMANENT_OWNER_ADDRESS = '0xYourPermOwnerAddress' // Add user's perm address here
const FAUCET_URL = 'https://faucet.circle.com/'

const TIPJAR_ABI = [
  // ... ABI with tip, withdraw, owner, totalCollected, getTipsCount functions ...
] as const

const NATIVE_DECIMALS = 18

// Multi-language Text Resources
const strings = {
  hi: {
    // Hindi strings
  },
  en: {
    // English strings
  },
} as const

// --- Sound Assistant ---
const successSound = new Audio('/success.mp3')
const errorSound = new Audio('/error.mp3')
const clickSound = new Audio('/click.mp3')

function speak(text: string) {
  const synth = window.speechSynthesis
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'hi-IN' // or 'en-US' based on lang
  utter.rate = 1.0
  synth.speak(utter)
}

// --- App Component ---
function TipJarApp() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()
  const { switchChain } = useSwitchChain()

  const [lang, setLang] = useState<'hi' | 'en'>('hi')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [totalCollected, setTotalCollected] = useState(0n)
  const [tipsCount, setTipsCount] = useState(0n)
  const [isOwner, setIsOwner] = useState(false)
  const [musicStation, setMusicStation] = useState('Desi Lofi')

  // Load stats
  useEffect(() => {
    // call totalCollected, getTipsCount, owner on contract
  }, [isConnected, publicClient, address])

  // Sound effects
  function playClick() { if (soundEnabled) clickSound.play() }

  // Multi-Country Music Radio
  const stations = ['Desi Lofi', 'Tokyo Chill', 'NYC Jazz', 'African Afrobeats']

  // Core Transaction Logic
  const { config } = usePrepareContractWrite({
    address: TIPJAR_ADDRESS,
    abi: TIPJAR_ABI,
    functionName: 'tip',
    args: ['Anonymous', `Ordering: ${cartLines.join(', ')}`], // User details
    value: parseUnits(total.toFixed(2), NATIVE_DECIMALS), // total chanda
    enabled: total > 0,
  })
  const { write, data, isLoading, isSuccess, isError } = useContractWrite(config)

  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: data?.hash,
  })

  // UX Feedback
  useEffect(() => {
    if (isError) { speak('गड़बड़ हो गई!'); errorSound.play() }
    if (isConfirmed) { speak('चंदा मिल गया!'); successSound.play(); resetCart() }
  }, [isError, isConfirmed])

  // --- Rendering UI with Authentic Design ---
  return (
    <div className="DApp_Container" style={{ background: mudWallTexture }}>
      <header style={{ background: kalamkariPattern }}>
        <h1 className="appName">चाय का चंदा | Roadside Nukkad</h1>
        <LanguageSelector />
        <SoundAssistant />
        <ConnectButton />
      </header>

      <main>
        {/* TAB Navigation */}
        <Tabs />

        {/* ORDER TAB */}
        {activeTab === 'Order' && (
          <section className="order">
            <h2 className="authenticSign">ROADSIDE NUKKAD CHAI STALL</h2>
            <Menu cart={cart} setCart={setCart} />
            <Summary cart={cart} total={total} write={write} />
          </section>
        )}

        {/* HUB TAB */}
        {activeTab === 'Hub' && (
          <section className="hub">
            <Radio stations={stations} current={musicStation} setStation={setMusicStation} />
            <Philosophy />
          </section>
        )}

        {/* VAULT TAB (Owner Only) */}
        {activeTab === 'Vault' && (
          <section className="vault">
            {isOwner ? <MasterConsole /> : <AccessDenied />}
          </section>
        )}

        {/* PERKS TAB */}
        {activeTab === 'Perks' && (
          <section className="perks">
            <LoyaltyTracker />
          </section>
        )}
      </main>

      <footer>
        <BuiltOnArc />
      </footer>
    }
}

// ... helper components like Menu, Radio, MasterConsole, Tabs, etc. ...
