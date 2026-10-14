import { useState, useCallback, useRef } from 'react'
import type { Lang } from '@/i18n'

const STORAGE_MUTE_KEY = 'chayChanda_mute'

function loadMute(): boolean {
  try {
    return localStorage.getItem(STORAGE_MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMute(v: boolean): void {
  try {
    localStorage.setItem(STORAGE_MUTE_KEY, v ? '1' : '0')
  } catch {
    // ignore
  }
}

const LANG_BCP47: Record<Lang, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
}

export function useSpeech(lang: Lang) {
  const [muted, setMuted] = useState<boolean>(loadMute)
  const lastRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(
    (text: string) => {
      if (muted) return
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      try {
        window.speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(text)
        utt.lang = LANG_BCP47[lang]
        utt.rate = 1
        utt.pitch = 1
        lastRef.current = utt
        window.speechSynthesis.speak(utt)
      } catch {
        // stay silent — browser may block synthesis
      }
    },
    [lang, muted],
  )

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      saveMute(next)
      if (next && typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel() } catch { /* ignore */ }
      }
      return next
    })
  }, [])

  return { speak, muted, toggleMute }
}
