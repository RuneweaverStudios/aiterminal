/**
 * useBottomPanel — state for the VS Code-style bottom panel.
 * Manages active tab, visibility, and height. Persists to localStorage.
 */

import { useState, useCallback, useEffect } from 'react'

export type BottomPanelTab = 'terminal' | 'claude' | 'output'

interface BottomPanelState {
  readonly isOpen: boolean
  readonly activeTab: BottomPanelTab
  readonly height: number
}

export interface UseBottomPanelReturn {
  readonly state: BottomPanelState
  readonly openTab: (tab: BottomPanelTab) => void
  readonly toggleTab: (tab: BottomPanelTab) => void
  readonly closePanel: () => void
  readonly setHeight: (h: number) => void
}

const STORAGE_KEY = 'aiterminal-bottom-panel'
const DEFAULT_HEIGHT = 300
const MIN_HEIGHT = 120
const MAX_HEIGHT = 800

function loadState(): BottomPanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        isOpen: parsed.isOpen ?? false,
        activeTab: parsed.activeTab ?? 'terminal',
        height: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, parsed.height ?? DEFAULT_HEIGHT)),
      }
    }
  } catch { /* ignore */ }
  return { isOpen: false, activeTab: 'terminal', height: DEFAULT_HEIGHT }
}

function saveState(state: BottomPanelState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export function useBottomPanel(): UseBottomPanelReturn {
  const [state, setState] = useState<BottomPanelState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const openTab = useCallback((tab: BottomPanelTab) => {
    setState(prev => ({ ...prev, isOpen: true, activeTab: tab }))
  }, [])

  const toggleTab = useCallback((tab: BottomPanelTab) => {
    setState(prev => {
      if (prev.isOpen && prev.activeTab === tab) {
        return { ...prev, isOpen: false }
      }
      return { ...prev, isOpen: true, activeTab: tab }
    })
  }, [])

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const setHeight = useCallback((h: number) => {
    setState(prev => ({
      ...prev,
      height: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h)),
    }))
  }, [])

  return { state, openTab, toggleTab, closePanel, setHeight }
}
