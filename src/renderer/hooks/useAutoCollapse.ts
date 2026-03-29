/**
 * useAutoCollapse — auto-collapse hook with configurable timer.
 *
 * Starts expanded, then collapses after a delay. Manual toggle
 * cancels the auto-collapse timer.
 *
 * Inspired by Agent Zero's auto-collapse behavior on process steps.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseAutoCollapseOptions {
  readonly delayMs: number
  readonly enabled?: boolean
}

export interface UseAutoCollapseReturn {
  readonly isExpanded: boolean
  readonly toggle: () => void
}

export function useAutoCollapse({
  delayMs,
  enabled = true,
}: UseAutoCollapseOptions): UseAutoCollapseReturn {
  const [isExpanded, setIsExpanded] = useState(true)
  const manualRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || manualRef.current) return

    timerRef.current = setTimeout(() => {
      if (!manualRef.current) {
        setIsExpanded(false)
      }
    }, delayMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [delayMs, enabled])

  const toggle = useCallback(() => {
    manualRef.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsExpanded(prev => !prev)
  }, [])

  return { isExpanded, toggle }
}
