```react
import React, { useState, useEffect, useRef } from 'react';
import { 
  Coffee, Heart, Wallet, RefreshCw, Volume2, VolumeX, Music, ShieldCheck, 
  Award, Clock, Compass, Plus, Minus, ShoppingBag, Gift, Sparkles, AlertCircle, 
  CheckCircle2, ChevronDown, UserCheck, Flame, Send, Globe, Radio, Truck, 
  Utensils, Droplet, Zap, Navigation, MapPin, KeyRound, Copy, Check
} from 'lucide-react';

// --- CONFIGURATION & CONTRACT CONSTANTS ---
const ARC_TESTNET_CHAIN_ID = 5042002;
const CONTRACT_ADDRESS = '0xd385945e5b5cdf022b99e4468a37ec045cd24197';
const FAUCET_URL = 'https://faucet.circle.com/';

// Types
type Language = 'hi' | 'en';
type ActiveTab = 'order' | 'hub' | 'vault' | 'perks' | 'emergency' | 'baithak';

interface MenuItem {
  id: string;
  nameHi: string;
  nameEn: string;
  price: number;
  icon: string;
  category: 'chai' | 'nasta' | 'combo';
  descHi: string;
  descEn: string;
}

interface Station {
  id: string;
  name: string;
  flag: string;
  genre: string;
  audioUrl: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'cutting', nameHi: 'कटिंग चाय', nameEn: 'Cutting Chai', price: 0.25, icon: '☕', category: 'chai', descHi: 'कड़क इलायची व अदरक स्वाद', descEn: 'Strong ginger & cardamom flavor' },
  { id: 'kulhad', nameHi: 'कुल्हड़ चाय', nameEn: 'Kulhad Chai', price: 0.50, icon: '🏺', category: 'chai', descHi: 'सोंधी मिट्टी की खुशबू वाली चाय', descEn: 'Pure earthen pot aromatic tea' },
  { id: 'masala', nameHi: 'मसाला चाय', nameEn: 'Masala Chai', price: 0.75, icon: '🫖', category: 'chai', descHi: '8 देसी मसालों का अनोखा संगम', descEn: 'Blend of 8 authentic spices' },
  { id: 'samosa', nameHi: 'गरम समोसा (2 पीस)', nameEn: 'Hot Samosa (2 pcs)', price: 0.50, icon: '🥟', category: 'nasta', descHi: 'आलू और हरी मटर की सोंधी स्टफिंग', descEn: 'Spiced potato & pea filling' },
  { id: 'kachori', nameHi: 'खस्ता कचौरी', nameEn: 'Khasta Kachori', price: 0.60, icon: '🫓', category: 'nasta', descHi: 'मूंग दाल की क्रिस्पी कचौरी', descEn: 'Crispy lentil stuffed pastry' },
  { id: 'lassi', nameHi: 'मलाई लस्सी', nameEn: 'Malai Lassi', price: 0.80, icon: '🥛', category: 'nasta', descHi: 'ठंडी और गाढ़ी कुल्हड़ लस्सी', descEn: 'Chilled thick yogurt shake' },
  { id: 'paratha', nameHi: 'आलू पराठा', nameEn: 'Aloo Paratha', price: 1.25, icon: '🥞', category: 'nasta', descHi: 'मक्खन और अमचूर चटनी के साथ', descEn: 'Served with fresh butter & chutney' },
  { id: 'combo', nameHi: 'चाय + समोसा कॉम्बो', nameEn: 'Chai + Samosa Combo', price: 1.00, icon: '⚡', category: 'combo', descHi: '1 कुल्हड़ चाय + 2 गरम समोसे', descEn: '1 Kulhad Chai + 2 Hot Samosas' },
  { id: 'special', nameHi: 'कुल्हड़ स्पेशल थाली', nameEn: 'Kulhad Special Pass', price: 2.50, icon: '🌟', category: 'combo', descHi: 'रॉयल नाश्ता + अनलिमिटेड चाय', descEn: 'Royal breakfast & free refill' },
];

const STATIONS: Station[] = [
  { id: 'desi', name: 'भारत (Desi Village Lo-Fi)', flag: '🇮🇳', genre: 'Acoustic Sitar & Rain Vibes', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'sakura', name: 'जापान (Sakura Ambient)', flag: '🇯🇵', genre: 'Zen Koto & Garden Breeze', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
  { id: 'sunset', name: 'अमेरिका (NYC Sunset Chill)', flag: '🇺🇸', genre: 'Smooth Jazz & Lo-Fi Beats', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792ce.mp3' },
  { id: 'paris', name: 'फ़्रांस (Paris Cafe Accordion)', flag: '🇫🇷', genre: 'Vintage Bistro Melodies', audioUrl: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_9648943715.mp3' },
];

export default function App() {
  // App State
  const [lang, setLang] = useState<Language>('hi');
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customNote, setCustomNote] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [dineMode, setDineMode] = useState<'dinein' | 'delivery'>('dinein');
  const [coupon, setCoupon] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  
  // Web3 & Wallet State (Simulated & Web3 Native Fallback)
  const [connectedAddress, setConnectedAddress] = useState<string>('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [usdcBalance, setUsdcBalance] = useState<number>(45.80);
  const [treasuryTotal, setTreasuryTotal] = useState<number>(1284.50);
  const [totalOrders, setTotalOrders] = useState<number>(342);
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');

  // Audio Radio State
  const [currentStation, setCurrentStation] = useState<Station>(STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Loyalty & Baithak & Community Pool State
  const [userOrdersCount, setUserOrdersCount] = useState<number>(3);
  const [communityPoolChais, setCommunityPoolChais] = useState<number>(14);
  const [baithakTime, setBaithakTime] = useState<string>('17:00');
  const [baithakGuests, setBaithakGuests] = useState<number>(2);
  const [baithakBooked, setBaithakBooked] = useState<boolean>(false);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  // Voice Assistant (SpeechSynthesis)
  const speak = (textHi: string, textEn: string) => {
    if (soundMuted) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = lang === 'hi' ? textHi : textEn;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Sound Effect Helper
  const playSoundEffect = (type: 'click' | 'add' | 'success') => {
    if (soundMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'add') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Cart Handlers
  const updateQuantity = (itemId: string, delta: number) => {
    playSoundEffect('add');
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const updated = Math.max(0, current + delta);
      const newCart = { ...prev };
      if (updated === 0) {
        delete newCart[itemId];
      } else {
        newCart[itemId] = updated;
      }
      return newCart;
    });
  };

  // Calculated totals
  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const finalTotal = Math.max(0, subtotal - discount);

  // Apply Coupon
  const applyCoupon = () => {
    playSoundEffect('click');
    if (coupon.trim().toUpperCase() === 'NUKKAD10') {
      setDiscount(0.10);
      speak('कूपन एनयूकेकेएडी10 लागू हुआ! 0.10 यूएसडीसी की छूट', 'Coupon NUKKAD10 applied! 0.10 USDC discount');
    } else if (coupon.trim().toUpperCase() === 'CHAIWE3') {
      setDiscount(0.25);
      speak('कूपन चायवेब3 लागू हुआ! 0.25 यूएसडीसी की छूट', 'Coupon CHAIWE3 applied! 0.25 USDC discount');
    } else {
      speak('अमान्य कूपन कोड', 'Invalid coupon code');
    }
  };

  // Execute Web3 USDC Transaction
  const handlePay = async (overrideAmount?: number, description?: string) => {
    const amountToPay = overrideAmount !== undefined ? overrideAmount : finalTotal;
    if (amountToPay <= 0) {
      speak('कृपया पहले कुछ आइटम चुनें', 'Please select items to order first');
      return;
    }

    if (usdcBalance < amountToPay) {
      speak('आपके पास पर्याप्त बैलेंस नहीं है', 'Insufficient USDC balance in wallet');
      alert(lang === 'hi' ? 'बैलेंस कम है! Circle Faucet से Arc Testnet USDC लें।' : 'Low Balance! Get Arc Testnet USDC from Circle Faucet.');
      return;
    }

    setTxStatus('processing');
    speak('ट्रांजैक्शन प्रोसेस हो रहा है, कृपया प्रतीक्षा करें', 'Processing Web3 transaction, please wait');

    // Simulate On-Chain Smart Contract Execution on Arc Testnet
    setTimeout(() => {
      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setTxHash(randomHash);
      setTxStatus('success');
      setUsdcBalance((prev) => +(prev - amountToPay).toFixed(2));
      setTreasuryTotal((prev) => +(prev + amountToPay).toFixed(2));
      setTotalOrders((prev) => prev + 1);
      setUserOrdersCount((prev) => prev + 1);
      
      playSoundEffect('success');
      speak(
        `धन्यवाद! आपका ${amountToPay.toFixed(2)} यूएसडीसी का चंदा सीधे मर्चेंट वॉलेट पर जमा हो गया है!`,
        `Thank you! Your donation of ${amountToPay.toFixed(2)} USDC was transferred directly to merchant wallet!`
      );

      // Reset cart if regular order
      if (overrideAmount === undefined) {
        setCart({});
        setDiscount(0);
        setCoupon('');
      }
    }, 2200);
  };

  // Toggle Music Radio
  const toggleRadio = () => {
    playSoundEffect('click');
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const changeStation = (station: Station) => {
    playSoundEffect('click');
    setCurrentStation(station);
    setIsPlaying(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 100);
  };

  // Copy Contract Address
  const copyContract = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#14100E] text-[#F3E9DC] font-sans antialiased selection:bg-[#D48E59] selection:text-black">
      {/* BACKGROUND AUDIO PLAYER */}
      <audio ref={audioRef} src={currentStation.audioUrl} loop preload="auto" />

      {/* TOP DECORATIVE MANDALA / PATTERN BAR */}
      <div className="h-2 w-full bg-gradient-to-r from-[#A26B43] via-[#D48E59] to-[#905D3D] shadow-md" />

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-[#1C1613]/95 backdrop-blur-md border-b border-[#3A2A20] px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Stall Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D48E59] to-[#A26B43] p-0.5 shadow-lg shadow-[#D48E59]/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#1C1613] rounded-[14px] flex items-center justify-center text-2xl">
                🫖
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wide text-[#F3E9DC] font-serif">
                  {lang === 'hi' ? 'चाय का चंदा' : 'Chai Ka Chanda'}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#D48E59]/20 text-[#D48E59] border border-[#D48E59]/40 px-2 py-0.5 rounded-full">
                  Nukkad Web3
                </span>
              </div>
              <p className="text-xs text-[#A8988B] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#D48E59]" />
                {lang === 'hi' ? 'देसी नुक्कड़ चाय टपरी • आर्क टेस्टनेट' : 'Authentic Village Nukkad • Arc Testnet'}
              </p>
            </div>
          </div>

          {/* Controls: Language, Sound, Wallet */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Audio Voice Feedback Toggle */}
            <button
              onClick={() => {
                setSoundMuted(!soundMuted);
                playSoundEffect('click');
              }}
              className={`p-2 rounded-xl border transition-all ${
                soundMuted
                  ? 'bg-[#2A1F19] text-[#887466] border-[#3A2A20]'
                  : 'bg-[#3D2619] text-[#D48E59] border-[#D48E59]/50 shadow-sm'
              }`}
              title={soundMuted ? 'Voice Muted' : 'Voice Enabled'}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Language Toggle */}
            <div className="flex items-center bg-[#281D17] border border-[#3A2A20] rounded-xl p-1">
              <button
                onClick={() => { setLang('hi'); speak('हिंदी भाषा चुनी गई', 'Hindi selected'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === 'hi' ? 'bg-[#D48E59] text-black shadow' : 'text-[#A8988B] hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => { setLang('en'); speak('English language selected', 'English selected'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === 'en' ? 'bg-[#D48E59] text-black shadow' : 'text-[#A8988B] hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Connected Wallet Box */}
            <div className="flex items-center gap-2 bg-[#281D17] border border-[#4A3528] px-3 py-1.5 rounded-xl shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-[#A8988B] leading-none font-medium">Arc Testnet</div>
                <div className="text-xs font-mono font-bold text-[#F3E9DC]">
                  {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                </div>
              </div>
              <div className="pl-1 border-l border-[#3A2A20] text-xs font-bold text-[#D48E59]">
                {usdcBalance.toFixed(2)} USDC
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* HERO DESI NUKKAD BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#251A14] to-[#14100E] border-b border-[#3A2A20] px-4 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3A2518] border border-[#5C3B27] text-xs font-semibold text-[#E59F6D]">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
              {lang === 'hi' ? 'ताज़ा शुद्ध गाय के दूध और अदरक की कड़क चाय' : 'Fresh Pure Cow Milk & Hand-Crushed Cardamom Chai'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#FFF6ED] font-serif leading-tight">
              {lang === 'hi' ? 'गाँव के नुक्कड़ की सोंधी खुशबू और Web3 USDC चंदा' : 'Village Nukkad Hospitality & Web3 USDC Donations'}
            </h2>
            <p className="text-sm text-[#B8A798] leading-relaxed">
              {lang === 'hi'
                ? 'कोई बिचौलिया नहीं। आपकी चाय और चंदे का सीधा भुगतान व्यापारी के विकेंद्रीकृत वॉलेट में तुरंत जमा होता है।'
                : 'No middlemen. Your chai orders and donations settle directly into the merchant’s decentralized wallet instantly.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-[#D48E59]">
              <span className="flex items-center gap-1 bg-[#1C1613] px-3 py-1.5 rounded-lg border border-[#3A2A20]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Smart Contract: 0xd385...4197
              </span>
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 bg-[#D48E59]/10 hover:bg-[#D48E59]/20 text-[#E59F6D] border border-[#D48E59]/30 px-3 py-1.5 rounded-lg transition-all"
              >
                <Droplet className="w-4 h-4 text-sky-400" />
                {lang === 'hi' ? 'मुफ़्त USDC फॉसेट' : 'Free USDC Faucet'}
              </a>
            </div>
          </div>

          {/* Quick Treasury Stats Card */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#2A1D16] to-[#1F150F] p-5 rounded-3xl border border-[#4A3528] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#3A2A20] pb-3">
              <span className="text-xs font-bold text-[#A8988B] uppercase tracking-wider">
                {lang === 'hi' ? 'लाइव ऑन-चेन आंकड़े' : 'Live On-Chain Stats'}
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                Chain ID: 5042002
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-black text-[#F3E9DC]">{treasuryTotal.toFixed(2)} USDC</div>
                <div className="text-xs text-[#A8988B]">{lang === 'hi' ? 'कुल एकत्रित चंदा' : 'Total Treasury Collected'}</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#D48E59]">{totalOrders}</div>
                <div className="text-xs text-[#A8988B]">{lang === 'hi' ? 'सफल ऑन-चेन आर्डर' : 'Total Successful Orders'}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-[#3A2A20] flex items-center justify-between text-xs text-[#A8988B]">
              <span>{lang === 'hi' ? 'कम्युनिटी फ्री चाय पूल:' : 'Free Chai Pool:'}</span>
              <span className="font-bold text-[#E59F6D]">{communityPoolChais} {lang === 'hi' ? 'कुल्हड़ उपलब्ध' : 'Kulhads Avail'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* NAVIGATION TABS */}
      <nav className="bg-[#18120F] border-b border-[#3A2A20] sticky top-[65px] z-30">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'order', labelHi: 'ऑर्डर व मेनू', labelEn: 'Menu & Order', icon: ShoppingBag },
            { id: 'hub', labelHi: 'नुक्कड़ रेडियो व संगीत', labelEn: 'Radio & Vibes', icon: Radio },
            { id: 'baithak', labelHi: 'बैठक बुकिंग', labelEn: 'Baithak Seat', icon: Utensils },
            { id: 'emergency', labelHi: 'आपातकालीन सहायता', labelEn: 'Quick Assist', icon: Zap },
            { id: 'perks', labelHi: 'कुल्हड़ पास (Loyalty)', labelEn: 'Kulhad Loyalty', icon: Award },
            { id: 'vault', labelHi: 'मास्टर की तिजोरी', labelEn: 'Owner Vault', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  playSoundEffect('click');
                  speak(
                    lang === 'hi' ? `${tab.labelHi} टैब चुना गया` : `${tab.labelEn} tab opened`,
                    `${tab.labelEn} tab opened`
                  );
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D48E59] to-[#A26B43] text-black border-[#D48E59] shadow-lg'
                    : 'bg-[#221813] text-[#A8988B] border-[#3A2A20] hover:border-[#5C3B27] hover:text-[#F3E9DC]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#D48E59]'}`} />
                {lang === 'hi' ? tab.labelHi : tab.labelEn}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ==================== TAB 1: MENU & ORDER ==================== */}
        {activeTab === 'order' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Menu Items List */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between border-b border-[#3A2A20] pb-3">
                <div>
                  <h3 className="text-xl font-bold font-serif text-[#F3E9DC]">
                    {lang === 'hi' ? 'देसी नुक्कड़ रेट लिस्ट' : 'Nukkad Menu Price List'}
                  </h3>
                  <p className="text-xs text-[#A8988B]">
                    {lang === 'hi' ? 'ताज़ा कुल्हड़ नाश्ता और कड़क चाय' : 'Fresh Kulhad Refreshments & Snacks'}
                  </p>
                </div>
                <span className="text-xs text-[#D48E59] font-mono bg-[#281D17] px-3 py-1 rounded-lg border border-[#3A2A20]">
                  USDC Settled
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MENU_ITEMS.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        qty > 0
                          ? 'bg-[#2A1D16] border-[#D48E59] shadow-md shadow-[#D48E59]/10'
                          : 'bg-[#1C1613] border-[#3A2A20] hover:border-[#4A3528]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-3xl p-2 bg-[#281D17] rounded-xl border border-[#3A2A20]">
                            {item.icon}
                          </span>
                          <span className="text-sm font-black font-mono text-[#D48E59] bg-[#3A2518] px-2.5 py-1 rounded-lg border border-[#5C3B27]">
                            {item.price.toFixed(2)} USDC
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-[#F3E9DC] mt-3">
                          {lang === 'hi' ? item.nameHi : item.nameEn}
                        </h4>
                        <p className="text-xs text-[#A8988B] mt-1 leading-snug">
                          {lang === 'hi' ? item.descHi : item.descEn}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2A1F19]">
                        <span className="text-[11px] text-[#887466] uppercase tracking-wider font-semibold">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-2 bg-[#14100E] p-1 rounded-xl border border-[#3A2A20]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={qty === 0}
                            className="p-1 rounded-lg bg-[#281D17] text-[#A8988B] hover:text-white disabled:opacity-30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold font-mono text-[#F3E9DC]">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded-lg bg-[#D48E59] text-black font-bold hover:bg-[#E59F6D]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Receipt & Checkout Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-gradient-to-b from-[#241A14] to-[#1A120E] p-6 rounded-3xl border border-[#4A3528] shadow-2xl relative">
                {/* Decorative Receipt Cut */}
                <div className="flex items-center justify-between border-b border-dashed border-[#4A3528] pb-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold font-serif text-[#F3E9DC] flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-[#D48E59]" />
                      {lang === 'hi' ? 'ऑर्डर रसीद पर्ची' : 'Order Bill Receipt'}
                    </h3>
                    <p className="text-xs text-[#A8988B]">Nukkad Chai Stall • Arc Testnet</p>
                  </div>
                  <span className="text-[10px] bg-[#3A2518] text-[#E59F6D] px-2 py-1 rounded font-mono">
                    #CHK-{Math.floor(1000 + Math.random() * 9000)}
                  </span>
                </div>

                {/* Dine-In / Delivery Selection */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => { setDineMode('dinein'); playSoundEffect('click'); }}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      dineMode === 'dinein'
                        ? 'bg-[#D48E59] text-black border-[#D48E59]'
                        : 'bg-[#1C1613] text-[#A8988B] border-[#3A2A20]'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    {lang === 'hi' ? 'स्टॉल पर बैठकर' : 'Dine-In (Stall)'}
                  </button>
                  <button
                    onClick={() => { setDineMode('delivery'); playSoundEffect('click'); }}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      dineMode === 'delivery'
                        ? 'bg-[#D48E59] text-black border-[#D48E59]'
                        : 'bg-[#1C1613] text-[#A8988B] border-[#3A2A20]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {lang === 'hi' ? 'पार्सल ले जाएँ' : 'Takeaway Delivery'}
                  </button>
                </div>

                {/* Items Breakdown */}
                <div className="space-y-2 min-h-[140px] max-h-[220px] overflow-y-auto pr-1">
                  {Object.keys(cart).length === 0 ? (
                    <div className="text-center py-10 text-xs text-[#887466] space-y-1">
                      <Coffee className="w-8 h-8 mx-auto opacity-40 text-[#D48E59]" />
                      <p>{lang === 'hi' ? 'आपकी टोकरी खाली है' : 'Your order cart is empty'}</p>
                      <p className="text-[10px] text-[#A8988B]">{lang === 'hi' ? 'मेनू से कुल्हड़ चाय या नाश्ता जोड़ें' : 'Select delicious chai or snacks'}</p>
                    </div>
                  ) : (
                    Object.entries(cart).map(([id, qty]) => {
                      const item = MENU_ITEMS.find((m) => m.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#2A1F19]">
                          <div className="flex items-center gap-2">
                            <span>{item.icon}</span>
                            <span className="font-medium text-[#F3E9DC]">
                              {lang === 'hi' ? item.nameHi : item.nameEn} × {qty}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[#E59F6D]">
                            {(item.price * qty).toFixed(2)} USDC
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sender Inputs */}
                <div className="space-y-2 pt-4 border-t border-[#3A2A20]">
                  <input
                    type="text"
                    placeholder={lang === 'hi' ? 'आपका नाम / शुभचिंतक (Optional)' : 'Your Name (Optional)'}
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-[#14100E] border border-[#3A2A20] rounded-xl px-3 py-2 text-xs text-[#F3E9DC] focus:outline-none focus:border-[#D48E59]"
                  />
                  <input
                    type="text"
                    placeholder={lang === 'hi' ? 'विशेष संदेश या चाय में कम चीनी?' : 'Special Note / Less Sugar request'}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full bg-[#14100E] border border-[#3A2A20] rounded-xl px-3 py-2 text-xs text-[#F3E9DC] focus:outline-none focus:border-[#D48E59]"
                  />
                </div>

                {/* Coupon Code Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. NUKKAD10)"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="flex-1 bg-[#14100E] border border-[#3A2A20] rounded-xl px-3 py-1.5 text-xs font-mono uppercase text-[#D48E59] focus:outline-none focus:border-[#D48E59]"
                  />
                  <button
                    onClick={applyCoupon}
                    className="bg-[#3A2518] hover:bg-[#4A3222] text-[#E59F6D] px-3 py-1.5 text-xs font-bold rounded-xl border border-[#5C3B27] transition-all"
                  >
                    {lang === 'hi' ? 'लागू करें' : 'Apply'}
                  </button>
                </div>

                {/* Price Calculation Summary */}
                <div className="space-y-1.5 pt-4 border-t border-[#3A2A20] text-xs">
                  <div className="flex justify-between text-[#A8988B]">
                    <span>{lang === 'hi' ? 'उप-कुल (Subtotal):' : 'Subtotal:'}</span>
                    <span className="font-mono">{subtotal.toFixed(2)} USDC</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>{lang === 'hi' ? 'कूपन छूट:' : 'Coupon Discount:'}</span>
                      <span className="font-mono">-{discount.toFixed(2)} USDC</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-[#F3E9DC] pt-2 border-t border-[#3A2A20]">
                    <span>{lang === 'hi' ? 'कुल देय राशि:' : 'Total Payable:'}</span>
                    <span className="font-mono text-[#D48E59]">{finalTotal.toFixed(2)} USDC</span>
                  </div>
                </div>

                {/* Payment Action Button */}
                <button
                  onClick={() => handlePay()}
                  disabled={txStatus === 'processing' || finalTotal <= 0}
                  className="w-full mt-5 py-3.5 px-4 bg-gradient-to-r from-[#D48E59] via-[#E59F6D] to-[#A26B43] hover:from-[#E59F6D] hover:to-[#D48E59] text-black font-black text-sm rounded-2xl shadow-xl shadow-[#D48E59]/20 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {txStatus === 'processing' ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-black" />
                      <span>{lang === 'hi' ? 'ब्लॉकचेन पर भुगतान हो रहा है...' : 'Processing Web3 Settlement...'}</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5 text-black" />
                      <span>
                        {lang === 'hi' ? `भुगतान करें (${finalTotal.toFixed(2)} USDC)` : `Pay Now (${finalTotal.toFixed(2)} USDC)`}
                      </span>
                    </>
                  )}
                </button>

                {/* Transaction Feedback Notification */}
                {txStatus === 'success' && (
                  <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'hi' ? 'भुगतान सफल रहा!' : 'Payment Successful!'}</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80">
                      {lang === 'hi' ? 'फंड सीधे मर्चेंट के सुरक्षित वॉलेट में ट्रांसफर हुआ।' : 'Funds directly transferred to merchant wallet.'}
                    </p>
                    <div className="text-[10px] font-mono text-emerald-400 truncate">
                      Tx: {txHash}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: GLOBAL MUSIC & VIBES ==================== */}
        {activeTab === 'hub' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-gradient-to-br from-[#241A14] to-[#1C1510] p-6 rounded-3xl border border-[#4A3528] shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-[#3A2A20] pb-4">
                <div>
                  <h3 className="text-xl font-bold font-serif text-[#F3E9DC] flex items-center gap-2">
                    <Radio className="w-6 h-6 text-[#D48E59]" />
                    {lang === 'hi' ? 'ग्लोबल नुक्कड़ म्यूजिक प्लेयर' : 'Global Cultural Radio Player'}
                  </h3>
                  <p className="text-xs text-[#A8988B]">
                    {lang === 'hi' ? 'चाय की चुस्की के साथ दुनिया भर के संगीत का आनंद लें' : 'Enjoy relaxing tunes while sipping fresh chai'}
                  </p>
                </div>
                <span className="text-xs bg-[#D48E59]/20 text-[#D48E59] px-2.5 py-1 rounded-full border border-[#D48E59]/30 font-semibold">
                  Live Streaming
                </span>
              </div>

              {/* Station Selection Cards */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#A8988B] uppercase tracking-wider">
                  {lang === 'hi' ? 'रेडियो स्टेशन चुनें:' : 'Select Radio Station:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STATIONS.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => changeStation(st)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        currentStation.id === st.id
                          ? 'bg-[#3A2518] border-[#D48E59] shadow-md shadow-[#D48E59]/20'
                          : 'bg-[#1C1613] border-[#3A2A20] hover:border-[#4A3528]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{st.flag}</span>
                          <span className="text-sm font-bold text-[#F3E9DC]">{st.name}</span>
                        </div>
                        <div className="text-[11px] text-[#A8988B] mt-1">{st.genre}</div>
                      </div>
                      {currentStation.id === st.id && isPlaying && (
                        <span className="flex gap-1 items-end h-4">
                          <span className="w-1 bg-[#D48E59] animate-bounce h-full" />
                          <span className="w-1 bg-[#D48E59] animate-bounce h-2/3" />
                          <span className="w-1 bg-[#D48E59] animate-bounce h-4/5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Controls Bar */}
              <div className="bg-[#14100E] p-4 rounded-2xl border border-[#3A2A20] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleRadio}
                    className="w-12 h-12 rounded-2xl bg-[#D48E59] hover:bg-[#E59F6D] text-black flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95"
                  >
                    {isPlaying ? <VolumeX className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                  </button>
                  <div>
                    <div className="text-sm font-bold text-[#F3E9DC]">{currentStation.name}</div>
                    <div className="text-xs text-[#A8988B]">{currentStation.genre}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#A8988B]">
                  <span>Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (audioRef.current) audioRef.current.volume = v;
                    }}
                    className="w-20 accent-[#D48E59]"
                  />
                </div>
              </div>
            </div>

            {/* Cultural Philosophy Card */}
            <div className="md:col-span-5 bg-gradient-to-br from-[#2A1F19] to-[#1C1613] p-6 rounded-3xl border border-[#4A3528] shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-[#D48E59] font-serif font-bold text-lg">
                <Sparkles className="w-5 h-5 text-amber-500" />
                {lang === 'hi' ? 'नुक्कड़ संस्कृति और दर्शन' : 'Nukkad Chai Philosophy'}
              </div>
              <p className="text-xs text-[#B8A798] leading-relaxed">
                {lang === 'hi'
                  ? 'भारतीय संस्कृति में चाय केवल एक पेय नहीं है, बल्कि आत्मीयता, संवाद और सामाजिक जुड़ाव की एक भावना है। यहाँ अमीर हो या गरीब, हर कोई एक ही बेंच पर बैठकर सोंधी खुशबू वाली कुल्हड़ चाय की चुस्की लेता है।'
                  : 'In Indian culture, Chai is not just a beverage; it is an emotion of warmth, conversation, and community harmony. People from all walks of life gather around the roadside stall to share moments.'}
              </p>

              {/* Pay It Forward Community Pool Section */}
              <div className="pt-4 border-t border-[#3A2A20] space-y-3">
                <h4 className="text-xs font-bold text-[#F3E9DC] uppercase tracking-wider flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  {lang === 'hi' ? 'पे-इट-फॉरवर्ड (फ्री चाय पूल)' : 'Pay-It-Forward Chai Pool'}
                </h4>
                <p className="text-xs text-[#A8988B]">
                  {lang === 'hi'
                    ? 'किसी ज़रूरतमंद के लिए 0.50 USDC का चंदा देकर मुफ़्त कुल्हड़ चाय स्पॉन्सर करें।'
                    : 'Sponsor a free Kulhad Chai for someone in need with a 0.50 USDC micro-donation.'}
                </p>

                <div className="flex items-center justify-between bg-[#14100E] p-3 rounded-2xl border border-[#3A2A20]">
                  <div>
                    <div className="text-xs text-[#887466]">{lang === 'hi' ? 'उपलब्ध मुफ़्त चाय:' : 'Available Free Chais:'}</div>
                    <div className="text-lg font-black text-[#D48E59]">{communityPoolChais} Kulhads</div>
                  </div>
                  <button
                    onClick={() => handlePay(0.50, 'Sponsor Free Chai')}
                    className="bg-[#3A2518] hover:bg-[#4A3222] text-[#E59F6D] border border-[#5C3B27] px-3 py-2 text-xs font-bold rounded-xl transition-all"
                  >
                    + Sponsor (0.50 USDC)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: BAITHAK BOOKING ==================== */}
        {activeTab === 'baithak' && (
          <div className="max-w-3xl mx-auto bg-gradient-to-b from-[#251A14] to-[#1C1613] p-6 sm:p-8 rounded-3xl border border-[#4A3528] shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#3A2518] border border-[#5C3B27] flex items-center justify-center text-2xl">
                🛋️
              </div>
              <h3 className="text-2xl font-bold font-serif text-[#F3E9DC]">
                {lang === 'hi' ? 'देसी बैठक व चारपाई सीट बुकिंग' : 'Nukkad Baithak Slot Reservation'}
              </h3>
              <p className="text-xs text-[#A8988B] max-w-md mx-auto">
                {lang === 'hi'
                  ? 'शाम की चाय पर अपने दोस्तों के साथ चारपाई और लकड़ी की चौकी बुक करें। टोकन डिपॉज़िट 0.50 USDC.'
                  : 'Reserve traditional charpai seating for your group chai sessions. Token deposit: 0.50 USDC.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#3A2A20]">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#A8988B]">{lang === 'hi' ? 'समय स्लॉट:' : 'Time Slot:'}</label>
                <select
                  value={baithakTime}
                  onChange={(e) => setBaithakTime(e.target.value)}
                  className="w-full bg-[#14100E] border border-[#3A2A20] rounded-xl p-3 text-xs text-[#F3E9DC] focus:outline-none"
                >
                  <option value="16:00">04:00 PM - 05:00 PM</option>
                  <option value="17:00">05:00 PM - 06:00 PM (Prime Sunset)</option>
                  <option value="18:00">06:00 PM - 07:00 PM</option>
                  <option value="19:00">07:00 PM - 08:00 PM</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#A8988B]">{lang === 'hi' ? 'सदस्यों की संख्या:' : 'Number of Guests:'}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={baithakGuests}
                  onChange={(e) => setBaithakGuests(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#14100E] border border-[#3A2A20] rounded-xl p-3 text-xs text-[#F3E9DC] focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#14100E] p-4 rounded-2xl border border-[#3A2A20] flex items-center justify-between text-xs">
              <span className="text-[#A8988B]">{lang === 'hi' ? 'सीट रिज़र्वेशन टोकन फ़ीस:' : 'Reservation Deposit:'}</span>
              <span className="font-mono font-bold text-[#D48E59]">0.50 USDC</span>
            </div>

            <button
              onClick={() => {
                handlePay(0.50, 'Baithak Reservation');
                setBaithakBooked(true);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-[#D48E59] to-[#A26B43] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:from-[#E59F6D] transition-all"
            >
              {lang === 'hi' ? 'बैठक बुक करें (0.50 USDC)' : 'Reserve Baithak Slot (0.50 USDC)'}
            </button>
          </div>
        )}

        {/* ==================== TAB 4: EMERGENCY QUICK ASSIST ==================== */}
        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <div className="border-b border-[#3A2A20] pb-3">
              <h3 className="text-xl font-bold font-serif text-[#F3E9DC] flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {lang === 'hi' ? 'आपातकालीन सहायता (Emergency Micro-Assist)' : 'Emergency Nukkad Micro-Assist'}
              </h3>
              <p className="text-xs text-[#A8988B]">
                {lang === 'hi' ? 'राहगीरों के लिए 0.10 USDC का तुरंत विकेंद्रीकृत सहायता ऑन-चेन ट्रांसफर' : 'Instant 0.10 USDC micro-transfers for emergency road aid'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { titleHi: 'फर्स्ट एड पट्टियाँ', titleEn: 'Medical First Aid', icon: '🩹' },
                { titleHi: 'इमरजेंसी जल', titleEn: 'Clean Water Refill', icon: '💧' },
                { titleHi: 'पावरबैंक चार्ज', titleEn: 'Phone Fast Charge', icon: '⚡' },
                { titleHi: 'ऑटो सवारी टोकन', titleEn: 'Quick Ride Assist', icon: '🛺' },
              ].map((aid, idx) => (
                <div key={idx} className="bg-[#1C1613] p-5 rounded-3xl border border-[#3A2A20] hover:border-[#D48E59] transition-all space-y-3">
                  <div className="text-3xl">{aid.icon}</div>
                  <h4 className="font-bold text-sm text-[#F3E9DC]">
                    {lang === 'hi' ? aid.titleHi : aid.titleEn}
                  </h4>
                  <div className="text-xs text-[#D48E59] font-mono">0.10 USDC</div>
                  <button
                    onClick={() => handlePay(0.10, aid.titleEn)}
                    className="w-full py-2 bg-[#3A2518] hover:bg-[#4A3222] text-[#E59F6D] text-xs font-bold rounded-xl border border-[#5C3B27] transition-all"
                  >
                    {lang === 'hi' ? 'सहायता लें' : 'Claim Aid'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 5: KULHAD LOYALTY PASS ==================== */}
        {activeTab === 'perks' && (
          <div className="max-w-3xl mx-auto bg-gradient-to-b from-[#241A14] to-[#1C1613] p-6 sm:p-8 rounded-3xl border border-[#4A3528] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#3A2A20] pb-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#F3E9DC] flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#D48E59]" />
                  {lang === 'hi' ? 'कुल्हड़ वीआईपी लॉयल्टी पास' : 'Kulhad Loyalty Tier Tracker'}
                </h3>
                <p className="text-xs text-[#A8988B]">
                  {lang === 'hi' ? 'हर 5 ऑन-चेन ऑर्डर पर पाएं 1 मुफ़्त स्पेशल कुल्हड़ चाय पास' : 'Unlock VIP Perks every 5 on-chain chai orders'}
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-[#D48E59] bg-[#3A2518] px-3 py-1 rounded-full border border-[#5C3B27]">
                Tier: Kulhad Silver
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#A8988B]">{lang === 'hi' ? 'ऑर्डर प्रगति:' : 'Orders Progress:'}</span>
                <span className="text-[#D48E59]">{userOrdersCount % 5} / 5 Orders</span>
              </div>
              <div className="h-3 w-full bg-[#14100E] rounded-full overflow-hidden border border-[#3A2A20] p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#D48E59] to-[#E59F6D] rounded-full transition-all duration-500"
                  style={{ width: `${((userOrdersCount % 5) / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-[#14100E] p-4 rounded-2xl border border-[#3A2A20] flex items-center gap-4">
              <div className="text-3xl">🏺</div>
              <div className="text-xs space-y-1">
                <div className="font-bold text-[#F3E9DC]">
                  {userOrdersCount >= 5 ? 'VIP Kulhad Pass Ready!' : 'Keep Ordering Chai'}
                </div>
                <div className="text-[#A8988B]">
                  {userOrdersCount >= 5
                    ? 'Congratulations! Claim your free special kulhad chai on your next order.'
                    : `Order ${5 - (userOrdersCount % 5)} more times to unlock your free reward.`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: MASTER KEY VAULT ==================== */}
        {activeTab === 'vault' && (
          <div className="max-w-3xl mx-auto bg-gradient-to-b from-[#251A14] to-[#1C1613] p-6 sm:p-8 rounded-3xl border border-[#4A3528] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#3A2A20] pb-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#F3E9DC] flex items-center gap-2">
                  <KeyRound className="w-6 h-6 text-[#D48E59]" />
                  {lang === 'hi' ? 'मास्टर की तिजोरी व रॉयल्टी कंसोल' : 'Master Key Royalty Vault'}
                </h3>
                <p className="text-xs text-[#A8988B]">
                  {lang === 'hi' ? 'मर्चेंट के लिए कुल बैलेंस और बैकअप नॉमिनी की जानकारी' : 'Secured Merchant Analytics & Backup Nominee'}
                </p>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-mono">
                Verified Owner
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#14100E] p-4 rounded-2xl border border-[#3A2A20]">
                <div className="text-xs text-[#887466]">{lang === 'hi' ? 'स्मार्ट कॉन्ट्रैक्ट का पता:' : 'Contract Address:'}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono text-[#F3E9DC] truncate max-w-[180px]">{CONTRACT_ADDRESS}</span>
                  <button onClick={copyContract} className="p-1 text-[#D48E59] hover:text-white">
                    {copiedContract ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-[#14100E] p-4 rounded-2xl border border-[#3A2A20]">
                <div className="text-xs text-[#887466]">{lang === 'hi' ? 'सुरक्षित मर्चेंट तिजोरी:' : 'Vault Balance:'}</div>
                <div className="text-lg font-black font-mono text-[#D48E59] mt-1">
                  {treasuryTotal.toFixed(2)} USDC
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#14100E] rounded-2xl border border-[#3A2A20] space-y-2">
              <div className="text-xs font-bold text-[#F3E9DC]">{lang === 'hi' ? 'डेसिग्नटेड बैकअप नॉमिनी पिलर:' : 'Nominee Backup Address:'}</div>
              <div className="text-xs font-mono text-[#A8988B]">0x99A8c...B2E1 (Permanent Inheritance Protection)</div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-[#3A2A20] bg-[#14100E] py-6 text-center text-xs text-[#A8988B]">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p>© 2026 Chai Ka Chanda • Authentic Roadside Village Nukkad Platform</p>
          <p className="text-[11px] text-[#A8988B]">
            Built on Arc Testnet (Chain ID 5042002) • Native USDC On-Chain Settlement
          </p>
        </div>
      </footer>
    </div>
  );
}
```
