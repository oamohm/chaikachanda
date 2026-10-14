export type Lang = 'hi' | 'en'

export const STORAGE_KEY = 'chayChanda_lang'

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'hi' || v === 'en') return v
  } catch { /* localStorage unavailable */ }
  return 'hi'
}

export function saveLang(lang: Lang): void {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('chayChanda_langChange')) } catch { /* ignore */ }
}

export interface Strings {
  appName: string
  totalCollected: string
  supporters: string
  network: string
  buyAChai: string
  customAmount: string
  yourName: string
  nameOptional: string
  namePlaceholder: string
  nameOptionalPlaceholder: string
  scanQr: string
  scanQrTitle: string
  scanQrCancel: string
  scanQrNotSupported: string
  tipsGoTo: string
  copied: string
  message: string
  messagePlaceholder: string
  yourBalance: string
  wrongChain: string
  addArcNetwork: string
  connectToTip: string
  connectWallet: string
  connecting: string
  switchNetwork: string
  switching: string
  sendTip: (amount: string) => string
  approving: string
  sendingTip: string
  /** Step 1 label with amount — shown in summary card and in-flight indicator */
  step1: (amount: string) => string
  step1Hint: string
  /** Step 2 label with amount */
  step2: (amount: string) => string
  waiting: string
  txPendingApprove: string
  txPendingTip: string
  txFailed: string
  txTimeout: string
  tryAgain: string
  /** Summary card */
  summaryTitle: string
  summaryYouSend: (amount: string) => string
  summaryFee: string
  summaryFeeValue: string
  summaryTo: string
  summaryAllowanceSufficient: string
  summaryApproveNote: string
  singleStepNote: string
  proceedBtn: (amount: string) => string
  /** Success */
  thankyouTitle: string
  thankyouBody: string
  viewExplorer: string
  sendAnother: string
  noTips: string
  recentSupporters: string
  contractLink: string
  langSwitchConfirm: string
  thankYouSpoken: string
  muteLabel: string
  unmuteLabel: string
  disconnect: string
  /** Post-tip verification */
  verifiedOnChain: string
  /** Error boundary */
  errorBoundaryTitle: string
  errorBoundaryMsg: string
  errorBoundaryReload: string
  /** Errors */
  errMin: string
  errEmptyName: string
  errNameLong: string
  errEmptyMsg: string
  errMsgLong: string
  errRejected: string
  errInsufficientFunds: string
  errBelowMin: string
  errNameTooLong: string
  errMsgTooLong: string
  errEmptyNameContract: string
  errEmptyMsgContract: string
  errTransferFailed: string
  errReverted: string
  errNetwork: string
  errDefault: string
  errConnectFailed: string
  /** Menu */
  menuTitle: string
  menuItemChai: string
  menuItemKulhadChai: string
  menuItemMasalaChai: string
  menuItemSamosa: string
  menuItemKachori: string
  menuItemLassi: string
  menuItemAloo: string
  menuItemCombo: string
  menuItemKulhad: string
  menuSplitTag: string
  menuOrdered: string
  /** Wallet address field */
  walletAddrLabel: string
  walletAddrPlaceholder: string
  /** Disconnect lock card */
  connectToView: string
  /** Faucet */
  faucetBtn: string
  faucetLowBalance: string
  /** Merchant directory */
  merchantTitle: string
  merchantSubtitle: string
  merchantSelectBtn: string
  merchantQrTitle: string
  merchantQrClose: string
  /** Vibe tags */
  vibeLabel: string
  vibeTags: string[]
  /** Storefront */
  fulfillmentTitle: string
  fulfillmentDelivery: string
  fulfillmentDineIn: string
  cartTitle: string
  cartEmpty: string
  cartTotal: string
  cartPlaceOrder: string
  cartQty: string
  /** Order receipt */
  receiptTitle: string
  receiptOrderId: string
  receiptStatus0: string
  receiptStatus1: string
  receiptStatus2: string
  receiptViewTx: string
  receiptNewOrder: string
  receiptItems: string
  receiptFulfillment: string
  receiptNoHistory: string
  myOrdersTitle: string
  /** Coupon */
  couponLabel: string
  couponPlaceholder: string
  couponApply: string
  couponSuccess: (pct: number) => string
  couponInvalid: string
  /** Kulhad NFT */
  nftPassTitle: string
  nftPassSubtitle: string
  nftPassClaim: string
  nftPassClaimed: string
  nftPassPerks: string[]
  /** Royalty console */
  royaltyTitle: string
  royaltyUnlock: string
  royaltyLocked: string
  royaltyKeyPlaceholder: string
  royaltyWrongKey: string
  royaltyWelcome: string
  /** Welcome toast */
  welcomeToast: string
  /** Register merchant */
  registerMerchantTitle: string
  registerMerchantName: string
  registerMerchantHandle: string
  registerMerchantAddress: string
  registerMerchantSubmit: string
  registerMerchantSuccess: string
}

export const strings: Record<Lang, Strings> = {
  hi: {
    appName: 'चाय का चंदा',
    totalCollected: 'कुल जमा',
    supporters: 'समर्थक',
    network: 'Arc Testnet',
    buyAChai: 'एक कप चाय पिलाएं',
    customAmount: 'अपनी राशि',
    yourName: 'आपका नाम',
    nameOptional: '(वैकल्पिक)',
    namePlaceholder: 'जैसे: अर्जुन',
    nameOptionalPlaceholder: 'खाली छोड़ें — पता दिखेगा',
    scanQr: 'QR स्कैन करें',
    scanQrTitle: 'QR कोड दिखाएं',
    scanQrCancel: 'रद्द करें',
    scanQrNotSupported: 'कैमरा उपलब्ध नहीं',
    tipsGoTo: 'चंदा जाएगा:',
    copied: 'कॉपी हो गया!',
    message: 'संदेश',
    messagePlaceholder: 'बहुत अच्छा काम!',
    yourBalance: 'आपका बैलेंस',
    wrongChain: 'Arc Testnet पर स्विच करें।',
    addArcNetwork: 'Arc Testnet जोड़ें',
    connectToTip: 'चंदा देने के लिए जुड़ें',
    connectWallet: 'वॉलेट जोड़ें',
    connecting: 'जुड़ रहे हैं…',
    switchNetwork: 'Arc Testnet पर जाएं',
    switching: 'बदल रहे हैं…',
    sendTip: (amt) => `${amt} USDC भेजें`,
    approving: 'मंज़ूरी दे रहे हैं…',
    sendingTip: 'चंदा भेज रहे हैं…',
    step1: (amt) => `चरण 1 / 2 — ${amt} USDC मंज़ूरी दें (पैसे अभी नहीं जाते)`,
    step1Hint: 'वॉलेट में 0 USDC दिख सकता है — यह सामान्य है।',
    step2: (amt) => `चरण 2 / 2 — ${amt} USDC चंदा भेजें`,
    waiting: 'प्रतीक्षा में…',
    txPendingApprove: 'मंज़ूरी की पुष्टि हो रही है…',
    txPendingTip: 'चंदा की पुष्टि हो रही है…',
    txFailed: 'लेनदेन विफल हुआ।',
    txTimeout: 'अभी भी लंबित है। अपने वॉलेट की Activity टैब देखें।',
    tryAgain: 'फिर कोशिश करें',
    summaryTitle: 'भेजने से पहले जांचें',
    summaryYouSend: (amt) => `आप भेजेंगे: ${amt} USDC`,
    summaryFee: 'नेटवर्क शुल्क (अनुमान)',
    summaryFeeValue: 'बहुत कम',
    summaryTo: 'जाएगा',
    summaryAllowanceSufficient: 'USDC पहले से मंज़ूर है — सीधे भेजा जाएगा।',
    summaryApproveNote: '2 चरण: पहले मंज़ूरी, फिर चंदा।',
    singleStepNote: 'एक ही लेनदेन में चंदा भेजा जाएगा।',
    proceedBtn: (amt) => `${amt} USDC भेजें`,
    thankyouTitle: 'शुक्रिया!',
    thankyouBody: 'आपका चंदा मिल गया। चाय आ रही है!',
    viewExplorer: 'Explorer पर देखें',
    sendAnother: 'एक और चंदा भेजें',
    noTips: 'अभी तक कोई चंदा नहीं। पहले समर्थक बनें!',
    recentSupporters: 'हाल के समर्थक',
    contractLink: 'Arc Testnet पर अनुबंध',
    langSwitchConfirm: 'भाषा हिंदी में बदली गई',
    thankYouSpoken: 'धन्यवाद, आपका चंदा मिल गया',
    muteLabel: 'आवाज़ बंद करें',
    unmuteLabel: 'आवाज़ चालू करें',
    disconnect: 'डिस्कनेक्ट',
    verifiedOnChain: 'Arc Testnet पर सत्यापित',
    errorBoundaryTitle: 'कुछ गलत हो गया',
    errorBoundaryMsg: 'पेज लोड नहीं हो सका। कृपया पुनः लोड करें।',
    errorBoundaryReload: 'पेज रिलोड करें',
    errMin: 'न्यूनतम चंदा 0.1 USDC है।',
    errEmptyName: 'कृपया अपना नाम दर्ज करें।',
    errNameLong: 'नाम 30 अक्षरों से कम होना चाहिए।',
    errEmptyMsg: 'कृपया संदेश लिखें।',
    errMsgLong: 'संदेश 80 अक्षरों से कम होना चाहिए।',
    errRejected: 'लेनदेन रद्द हो गया।',
    errInsufficientFunds: 'USDC बैलेंस कम है।',
    errBelowMin: 'राशि 0.1 USDC न्यूनतम से कम है।',
    errNameTooLong: 'नाम 30 अक्षरों से अधिक है।',
    errMsgTooLong: 'संदेश 80 अक्षरों से अधिक है।',
    errEmptyNameContract: 'कृपया अपना नाम दर्ज करें।',
    errEmptyMsgContract: 'कृपया संदेश लिखें।',
    errTransferFailed: 'USDC ट्रांसफर विफल। मंज़ूरी जांचें।',
    errReverted: 'लेनदेन विफल। पुनः प्रयास करें।',
    errNetwork: 'नेटवर्क त्रुटि। कनेक्शन जांचें।',
    errDefault: 'कुछ गलत हुआ। पुनः प्रयास करें।',
    errConnectFailed: 'वॉलेट कनेक्ट नहीं हो सका',
    menuTitle: 'देसी मेन्यू',
    menuItemChai: 'कटिंग चाय',
    menuItemKulhadChai: 'कुल्हड़ चाय',
    menuItemMasalaChai: 'मसाला चाय',
    menuItemSamosa: 'गरम समोसा',
    menuItemKachori: 'खस्ता कचौरी',
    menuItemLassi: 'मलाई लस्सी',
    menuItemAloo: 'आलू पराठा',
    menuItemCombo: 'चाय + समोसा कॉम्बो',
    menuItemKulhad: 'कुल्हड़ स्पेशल',
    menuSplitTag: 'प्रोग्रामेबल सेटलमेंट: 60% चाय / 40% समोसा',
    menuOrdered: 'ने मंगाया',
    walletAddrLabel: 'वॉलेट पता / ENS (वैकल्पिक)',
    walletAddrPlaceholder: '0x… पेस्ट करें या QR स्कैन करें',
    connectToView: 'चाय का चंदा देखने और चंदा देने के लिए अपना Web3 वॉलेट जोड़ें।',
    faucetBtn: 'फ्री USDC पाएं',
    faucetLowBalance: 'बैलेंस कम है? Arc Testnet Faucet से फ्री USDC लें।',
    merchantTitle: 'देसी व्यापारी',
    merchantSubtitle: 'किसी व्यापारी को चुनें और सीधे चंदा भेजें',
    merchantSelectBtn: 'चुनें',
    merchantQrTitle: 'QR कोड',
    merchantQrClose: 'बंद करें',
    vibeLabel: 'वाइब चुनें',
    vibeTags: ['☕ कटिंग चाय मास्टर', '🔥 एक्सट्रा इलायची', '🥐 क्रंची समोसा', '✨ चाय की दुकान का सितारा', '🎵 कव्वाली वाला मूड'],
    fulfillmentTitle: 'ऑर्डर कैसे लेंगे?',
    fulfillmentDelivery: '🛵 ऑनलाइन डिलीवरी / प्री-ऑर्डर',
    fulfillmentDineIn: '🪑 यहीं बैठकर / टेकअवे',
    cartTitle: '🛒 आपका ऑर्डर',
    cartEmpty: 'कुछ चुनें — मेन्यू देखें!',
    cartTotal: 'कुल',
    cartPlaceOrder: 'ऑर्डर भेजें',
    cartQty: 'नग',
    receiptTitle: '🧾 ऑर्डर रसीद',
    receiptOrderId: 'ऑर्डर ID',
    receiptStatus0: '📥 ऑर्डर मिला',
    receiptStatus1: '👨‍🍳 तैयारी हो रही है',
    receiptStatus2: '✅ तैयार है — आइए!',
    receiptViewTx: 'ब्लॉकचेन पर देखें',
    receiptNewOrder: 'नया ऑर्डर',
    receiptItems: 'आइटम',
    receiptFulfillment: 'डिलीवरी टाइप',
    receiptNoHistory: 'अभी तक कोई ऑर्डर नहीं।',
    myOrdersTitle: 'मेरे ऑर्डर',
    couponLabel: 'कूपन कोड (वैकल्पिक)',
    couponPlaceholder: 'जैसे: CHAI10',
    couponApply: 'लगाएं',
    couponSuccess: (pct) => `🎉 ${pct}% छूट लागू!`,
    couponInvalid: 'अमान्य कूपन कोड।',
    nftPassTitle: '🏺 कुल्हड़ NFT लॉयल्टी पास',
    nftPassSubtitle: 'चाय का चंदा का विशेष डिजिटल सदस्यता पास — ऑन-चेन',
    nftPassClaim: 'पास क्लेम करें (जल्द आ रहा है)',
    nftPassClaimed: '✅ पास मिल गया!',
    nftPassPerks: ['10% अतिरिक्त छूट', 'प्राथमिकता डिलीवरी', 'विशेष मेन्यू एक्सेस', 'ऑन-चेन लॉयल्टी पॉइंट'],
    royaltyTitle: '🔑 मास्टर की — रॉयल्टी कंसोल',
    royaltyUnlock: 'अनलॉक करें',
    royaltyLocked: '🔒 यह कंसोल केवल स्वामी के लिए है',
    royaltyKeyPlaceholder: 'मास्टर की दर्ज करें',
    royaltyWrongKey: '❌ गलत की। पहुंच अस्वीकृत।',
    royaltyWelcome: '✅ स्वागत है, मालिक! रॉयल्टी कंसोल खुला।',
    welcomeToast: 'अतिथि देवो भवः — चाय का चंदा में आपका स्वागत है ☕',
    registerMerchantTitle: '+ रजिस्टर करें',
    registerMerchantName: 'व्यापारी का नाम',
    registerMerchantHandle: 'हैंडल (जैसे: @ramesh)',
    registerMerchantAddress: 'वॉलेट पता (0x…)',
    registerMerchantSubmit: 'रजिस्टर करें',
    registerMerchantSuccess: '✅ व्यापारी जोड़ा गया!',
  },
  en: {
    appName: 'Chai ka Chanda',
    totalCollected: 'Total Collected',
    supporters: 'supporters',
    network: 'Arc Testnet',
    buyAChai: 'Buy a cup of chai',
    customAmount: 'Custom amount',
    yourName: 'Your name',
    nameOptional: '(optional)',
    namePlaceholder: 'e.g. Arjun',
    nameOptionalPlaceholder: 'Leave empty — address shown',
    scanQr: 'Scan QR',
    scanQrTitle: 'Show a QR code',
    scanQrCancel: 'Cancel',
    scanQrNotSupported: 'Camera not available',
    tipsGoTo: 'Tips go to:',
    copied: 'Copied!',
    message: 'Message',
    messagePlaceholder: 'Keep up the great work!',
    yourBalance: 'Your balance',
    wrongChain: 'Switch to Arc Testnet to send a tip.',
    addArcNetwork: 'Add Arc Testnet',
    connectToTip: 'Connect to tip',
    connectWallet: 'Connect Wallet',
    connecting: 'Connecting…',
    switchNetwork: 'Switch to Arc Testnet',
    switching: 'Switching…',
    sendTip: (amt) => `Send ${amt} USDC`,
    approving: 'Approving…',
    sendingTip: 'Sending tip…',
    step1: (amt) => `Step 1 of 2: allow ${amt} USDC (no money moves yet)`,
    step1Hint: 'Your wallet may show 0 USDC for this step — that is normal.',
    step2: (amt) => `Step 2 of 2: send ${amt} USDC`,
    waiting: 'Waiting…',
    txPendingApprove: 'Confirming approval…',
    txPendingTip: 'Confirming tip…',
    txFailed: 'Transaction failed.',
    txTimeout: "Still pending. Check your wallet's Activity tab.",
    tryAgain: 'Try again',
    summaryTitle: 'Review before sending',
    summaryYouSend: (amt) => `You send: ${amt} USDC`,
    summaryFee: 'Network fee (estimate)',
    summaryFeeValue: 'very small',
    summaryTo: 'To',
    summaryAllowanceSufficient: 'USDC already approved — will send directly.',
    summaryApproveNote: '2 steps: first approve, then tip.',
    singleStepNote: 'Your tip will be sent in a single transaction.',
    proceedBtn: (amt) => `Send ${amt} USDC`,
    thankyouTitle: 'Shukriya!',
    thankyouBody: 'Your tip has been sent. Chai is on its way!',
    viewExplorer: 'View on explorer',
    sendAnother: 'Send Another Tip',
    noTips: 'No tips yet. Be the first supporter!',
    recentSupporters: 'Recent Supporters',
    contractLink: 'Contract on Arc Testnet',
    langSwitchConfirm: 'Language switched to English',
    thankYouSpoken: 'Thank you, your tip was received',
    muteLabel: 'Mute voice',
    unmuteLabel: 'Unmute voice',
    disconnect: 'Disconnect',
    verifiedOnChain: 'Verified on Arc Testnet',
    errorBoundaryTitle: 'Something went wrong',
    errorBoundaryMsg: 'The page could not load. Please reload.',
    errorBoundaryReload: 'Reload page',
    errMin: 'Minimum tip is 0.1 USDC.',
    errEmptyName: 'Please enter your name.',
    errNameLong: 'Name must be 30 characters or fewer.',
    errEmptyMsg: 'Please write a message.',
    errMsgLong: 'Message must be 80 characters or fewer.',
    errRejected: 'Transaction cancelled.',
    errInsufficientFunds: 'Insufficient USDC balance.',
    errBelowMin: 'Amount is below the 0.1 USDC minimum.',
    errNameTooLong: 'Name exceeds 30 characters.',
    errMsgTooLong: 'Message exceeds 80 characters.',
    errEmptyNameContract: 'Please enter your name.',
    errEmptyMsgContract: 'Please enter a message.',
    errTransferFailed: 'USDC transfer failed. Check your approval.',
    errReverted: 'Transaction failed. Please try again.',
    errNetwork: 'Network error. Check your connection.',
    errDefault: 'Something went wrong. Please try again.',
    errConnectFailed: 'Wallet connection failed',
    menuTitle: 'Desi Menu',
    menuItemChai: 'Cutting Chai',
    menuItemKulhadChai: 'Kulhad Chai',
    menuItemMasalaChai: 'Masala Chai',
    menuItemSamosa: 'Hot Samosa',
    menuItemKachori: 'Crispy Kachori',
    menuItemLassi: 'Malai Lassi',
    menuItemAloo: 'Aloo Paratha',
    menuItemCombo: 'Chai + Samosa Combo',
    menuItemKulhad: 'Kulhad Special',
    menuSplitTag: 'Programmable Settlement: 60% Chai / 40% Samosa',
    menuOrdered: 'ordered',
    walletAddrLabel: 'Wallet Address / ENS (optional)',
    walletAddrPlaceholder: 'Paste 0x… or scan QR',
    connectToView: 'Connect your Web3 wallet to view Chai Ka Chanda stats and send a tip.',
    faucetBtn: 'Get Free USDC',
    faucetLowBalance: 'Low balance? Claim free testnet USDC from the Arc Faucet.',
    merchantTitle: 'Desi Merchants',
    merchantSubtitle: 'Pick a merchant and tip them directly',
    merchantSelectBtn: 'Select',
    merchantQrTitle: 'Payment QR',
    merchantQrClose: 'Close',
    vibeLabel: 'Pick a Vibe',
    vibeTags: ['☕ Cutting Chai Master', '🔥 Extra Elaichi', '🥐 Crunchy Samosa Vibe', '✨ Chai Dukaan Star', '🎵 Qawwali Mood'],
    fulfillmentTitle: 'How will you take your order?',
    fulfillmentDelivery: '🛵 Online Delivery / Pre-Order',
    fulfillmentDineIn: '🪑 Dine-In / Takeaway',
    cartTitle: '🛒 Your Order',
    cartEmpty: 'Pick something from the menu!',
    cartTotal: 'Total',
    cartPlaceOrder: 'Place Order',
    cartQty: 'qty',
    receiptTitle: '🧾 Order Receipt',
    receiptOrderId: 'Order ID',
    receiptStatus0: '📥 Order Received',
    receiptStatus1: '👨‍🍳 Preparing your order',
    receiptStatus2: '✅ Ready — come pick it up!',
    receiptViewTx: 'View on blockchain',
    receiptNewOrder: 'New Order',
    receiptItems: 'Items',
    receiptFulfillment: 'Fulfillment',
    receiptNoHistory: 'No orders yet.',
    myOrdersTitle: 'My Orders',
    couponLabel: 'Coupon Code (optional)',
    couponPlaceholder: 'e.g. CHAI10',
    couponApply: 'Apply',
    couponSuccess: (pct) => `🎉 ${pct}% discount applied!`,
    couponInvalid: 'Invalid coupon code.',
    nftPassTitle: '🏺 Kulhad NFT Loyalty Pass',
    nftPassSubtitle: 'Chai Ka Chanda exclusive digital membership — onchain',
    nftPassClaim: 'Claim Pass (coming soon)',
    nftPassClaimed: '✅ Pass claimed!',
    nftPassPerks: ['10% extra discount', 'Priority delivery', 'Exclusive menu access', 'Onchain loyalty points'],
    royaltyTitle: '🔑 Master Key — Royalty Console',
    royaltyUnlock: 'Unlock',
    royaltyLocked: '🔒 This console is owner-only',
    royaltyKeyPlaceholder: 'Enter master key',
    royaltyWrongKey: '❌ Wrong key. Access denied.',
    royaltyWelcome: '✅ Welcome, owner! Royalty console unlocked.',
    welcomeToast: 'Atithi Devo Bhava — Welcome to Chai Ka Chanda ☕',
    registerMerchantTitle: '+ Register',
    registerMerchantName: 'Merchant name',
    registerMerchantHandle: 'Handle (e.g. @ramesh)',
    registerMerchantAddress: 'Wallet address (0x…)',
    registerMerchantSubmit: 'Register',
    registerMerchantSuccess: '✅ Merchant added!',
  },
}
