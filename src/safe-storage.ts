/**
 * safe-storage.ts — imported as the first side-effect in main.tsx.
 *
 * Brave Shields (and some privacy browsers) block localStorage and
 * sessionStorage completely, throwing a SecurityError on any access.
 * This module:
 *   1. Probes both storages and replaces any that throw with an in-memory
 *      Map-backed fallback so the rest of the app never sees an exception.
 *   2. Patches Object.defineProperty on window so that wallet SDKs that try
 *      to define a non-configurable property on window.ethereum are silently
 *      skipped rather than throwing a TypeError.
 *   3. Exports `safeStorage` — a wagmi-compatible Storage object backed by
 *      the safe localStorage substitute. Pass it to wagmi createStorage().
 */

// ── 1. In-memory fallback implementation ─────────────────────────────────────

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  getItem(k: string): string | null { return this.store.get(k) ?? null }
  setItem(k: string, v: string): void { this.store.set(k, v) }
  removeItem(k: string): void { this.store.delete(k) }
  clear(): void { this.store.clear() }
}

function probe(storage: Storage): boolean {
  try {
    const key = '__probe__'
    storage.setItem(key, '1')
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

// Replace window.localStorage / window.sessionStorage if they throw.
// We must use Object.defineProperty rather than simple assignment because
// these are read-only properties in some browsers.
function installFallback(name: 'localStorage' | 'sessionStorage'): Storage {
  let s: Storage
  try {
    s = window[name]
    if (!probe(s)) throw new Error('blocked')
    return s
  } catch {
    const mem = new MemoryStorage()
    try {
      const desc = Object.getOwnPropertyDescriptor(window, name)
      if (!desc || desc.configurable !== false) {
        Object.defineProperty(window, name, { get: () => mem, configurable: true })
      }
    } catch { /* can't patch — callers will get MemoryStorage via safeStorage */ }
    return mem
  }
}

export const safeLocalStorage: Storage = installFallback('localStorage')
export const safeSessionStorage: Storage = installFallback('sessionStorage')

// ── 2. Patch Object.defineProperty to guard window.ethereum ──────────────────
// Some wallet SDKs (MetaMask, WalletConnect, Coinbase) attempt
// Object.defineProperty(window, 'ethereum', { configurable: false, ... }).
// If two SDKs do this, the second call throws "Cannot redefine property: ethereum".
// We wrap Object.defineProperty to skip the call when the property exists and
// the existing descriptor says configurable: false.

const _originalDefineProperty = Object.defineProperty.bind(Object)

Object.defineProperty = function patchedDefineProperty<T>(
  target: T,
  key: PropertyKey,
  descriptor: PropertyDescriptor & ThisType<unknown>,
): T {
  if (target === window && key === 'ethereum') {
    try {
      const existing = Object.getOwnPropertyDescriptor(target, key)
      if (existing && existing.configurable === false) {
        // Already locked — skip silently
        return target
      }
    } catch { /* ignore */ }
  }
  try {
    return _originalDefineProperty(target, key, descriptor)
  } catch (e) {
    // Swallow "Cannot redefine" errors on window so wallet SDKs don't crash the app.
    if (
      target === window &&
      e instanceof TypeError &&
      (e.message.includes('redefine') || e.message.includes('non-configurable'))
    ) {
      return target
    }
    throw e
  }
} as typeof Object.defineProperty

// ── 3. wagmi-compatible Storage export ───────────────────────────────────────
// wagmi's createStorage expects { getItem, setItem, removeItem }.

export const safeStorage = {
  getItem: (key: string) => safeLocalStorage.getItem(key),
  setItem: (key: string, value: string) => safeLocalStorage.setItem(key, value),
  removeItem: (key: string) => safeLocalStorage.removeItem(key),
}

// ── 4. Brave-safe wagmi cache purge ──────────────────────────────────────────
// Brave and some privacy browsers retain wallet session state in localStorage
// even after a disconnect, causing wagmi to re-hydrate a stale "connected"
// state on next page load. Call this on every disconnect to aggressively wipe
// all wagmi-owned keys so the next session starts clean.
export function purgeWagmiCache(): void {
  try {
    const WAGMI_PREFIXES = ['wagmi.', 'wc@2:', 'WALLETCONNECT_', '-walletlink:']
    const keysToRemove: string[] = []
    for (let i = 0; i < safeLocalStorage.length; i++) {
      const k = safeLocalStorage.key(i)
      if (k && WAGMI_PREFIXES.some((p) => k.startsWith(p))) keysToRemove.push(k)
    }
    keysToRemove.forEach((k) => safeLocalStorage.removeItem(k))
  } catch { /* stay silent — storage may be blocked */ }
  // Also wipe sessionStorage wagmi keys
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < safeSessionStorage.length; i++) {
      const k = safeSessionStorage.key(i)
      if (k && k.startsWith('wagmi.')) keysToRemove.push(k)
    }
    keysToRemove.forEach((k) => safeSessionStorage.removeItem(k))
  } catch { /* stay silent */ }
}
