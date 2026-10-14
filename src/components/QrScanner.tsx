/**
 * QrScanner — opens the device camera using getUserMedia and reads a QR code
 * with the built-in BarcodeDetector API (no libraries). Calls onResult with
 * the raw text of the first detected QR code, then closes.
 *
 * Accepts wallet-address QR codes in the formats:
 *   0x…              (plain hex address)
 *   ethereum:0x…     (EIP-681)
 *
 * If the browser does not support getUserMedia or BarcodeDetector the component
 * returns null and the parent hides the button.
 */

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onResult: (value: string) => void
  onClose: () => void
  cancelLabel: string
}

// Detect support synchronously so the parent can hide the button server-side.
export function qrScanSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    !!navigator.mediaDevices?.getUserMedia &&
    typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== 'undefined'
  )
}

export default function QrScanner({ onResult, onClose, cancelLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<unknown>(null)
  const rafRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const BD = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
        detectorRef.current = new BD({ formats: ['qr_code'] })
      } catch {
        setError('BarcodeDetector not available')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
      } catch {
        setError('Camera access denied')
        return
      }

      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)
        scan()
      }
    }

    function scan() {
      if (!videoRef.current || !detectorRef.current) return
      const detector = detectorRef.current as { detect: (img: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
      const detectFrame = async () => {
        if (cancelled) return
        try {
          const results = await detector.detect(videoRef.current!)
          if (results.length > 0) {
            const raw = results[0].rawValue
            // Accept plain 0x address or ethereum:0x…
            const match = raw.match(/(?:ethereum:)?(0x[0-9a-fA-F]{40})/)
            if (match) {
              stopStream()
              onResult(match[1])
              return
            }
          }
        } catch { /* frame not ready */ }
        rafRef.current = requestAnimationFrame(tick)
      }
      const tick = () => { void detectFrame() }
      rafRef.current = requestAnimationFrame(tick)
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      stopStream()
    }
  // onResult/onClose are stable callbacks; not listing them avoids re-mount on each render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function handleClose() {
    cancelAnimationFrame(rafRef.current)
    stopStream()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div className="relative w-full max-w-xs">
        {error ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <p className="text-white text-sm mb-4">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full rounded-2xl"
              style={{ maxHeight: '60dvh', objectFit: 'cover' }}
            />
            {/* Viewfinder overlay */}
            {scanning && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)',
              }}>
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>
            )}
          </>
        )}
      </div>
      <button
        onClick={handleClose}
        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
      >
        <X size={16} />
        {cancelLabel}
      </button>
    </div>
  )
}
