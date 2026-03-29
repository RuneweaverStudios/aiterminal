/**
 * usePacedValue — adaptive throttle for streaming text display.
 *
 * Instead of showing raw chunks (which flicker) or single characters
 * (which are too slow), this hook walks forward through text at
 * adaptive step sizes based on how much content remains.
 *
 * Inspired by OpenCode's createPacedValue pattern.
 */

import { useState, useEffect, useRef } from 'react'

const TICK_MS = 24

/**
 * Compute step size based on remaining characters.
 * Small remaining → small steps (smooth finish).
 * Large remaining → big steps (fast catch-up).
 */
function computeStep(remaining: number): number {
  if (remaining <= 12) return 2
  if (remaining <= 48) return 4
  if (remaining <= 96) return 8
  return Math.min(24, Math.ceil(remaining / 8))
}

/**
 * Returns a string that smoothly advances toward `target`.
 * When `streaming` is false, returns the full target immediately.
 */
export function usePacedValue(target: string, streaming: boolean): string {
  const [displayed, setDisplayed] = useState('')
  const displayedRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // When streaming stops, snap to full value
  useEffect(() => {
    if (!streaming) {
      displayedRef.current = target
      setDisplayed(target)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [streaming, target])

  // While streaming, advance on tick
  useEffect(() => {
    if (!streaming) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      const current = displayedRef.current
      const remaining = target.length - current.length

      if (remaining <= 0) return

      const step = computeStep(remaining)
      const next = target.slice(0, current.length + step)
      displayedRef.current = next
      setDisplayed(next)
    }, TICK_MS)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [streaming, target])

  return displayed
}
