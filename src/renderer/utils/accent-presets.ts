/**
 * Accent color presets — switchable UI accent independently from terminal theme.
 *
 * These only affect --accent-color, --accent-bright, --accent-glow, --accent-gradient.
 * Terminal ANSI colors remain unchanged.
 */

export interface AccentPreset {
  readonly id: string
  readonly name: string
  readonly color: string       // primary accent
  readonly bright: string      // lighter variant
  readonly muted: string       // darker variant
  readonly glow: string        // rgba for shadows/rings
  readonly gradient: string    // CSS gradient
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  {
    id: 'teal',
    name: 'Teal',
    color: '#14b8a6',
    bright: '#2dd4bf',
    muted: '#0d9488',
    glow: 'rgba(20, 184, 166, 0.3)',
    gradient: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
  },
  {
    id: 'purple',
    name: 'Purple',
    color: '#bd93f9',
    bright: '#d6acff',
    muted: '#9580cc',
    glow: 'rgba(189, 147, 249, 0.3)',
    gradient: 'linear-gradient(135deg, #bd93f9, #ff79c6)',
  },
  {
    id: 'blue',
    name: 'Blue',
    color: '#6b9dff',
    bright: '#8bb5ff',
    muted: '#5580cc',
    glow: 'rgba(107, 157, 255, 0.3)',
    gradient: 'linear-gradient(135deg, #6b9dff, #38bdf8)',
  },
  {
    id: 'green',
    name: 'Green',
    color: '#50fa7b',
    bright: '#69ff94',
    muted: '#40c463',
    glow: 'rgba(80, 250, 123, 0.3)',
    gradient: 'linear-gradient(135deg, #50fa7b, #2dd4bf)',
  },
  {
    id: 'orange',
    name: 'Orange',
    color: '#ffb86c',
    bright: '#ffd699',
    muted: '#cc9356',
    glow: 'rgba(255, 184, 108, 0.3)',
    gradient: 'linear-gradient(135deg, #ffb86c, #f97316)',
  },
  {
    id: 'rose',
    name: 'Rose',
    color: '#ff79c6',
    bright: '#ff92df',
    muted: '#cc60a0',
    glow: 'rgba(255, 121, 198, 0.3)',
    gradient: 'linear-gradient(135deg, #ff79c6, #f43f5e)',
  },
]

const STORAGE_KEY = 'aiterminal-accent-preset'

export function getStoredAccentId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'teal'
  } catch {
    return 'teal'
  }
}

export function storeAccentId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

export function getAccentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find(p => p.id === id) ?? ACCENT_PRESETS[0]
}

/**
 * Apply accent preset to the document root CSS variables.
 */
export function applyAccentPreset(preset: AccentPreset): void {
  const root = document.documentElement
  root.style.setProperty('--accent-color', preset.color)
  root.style.setProperty('--accent-bright', preset.bright)
  root.style.setProperty('--accent-muted', preset.muted)
  root.style.setProperty('--accent-glow', preset.glow)
  root.style.setProperty('--accent-gradient', preset.gradient)
  root.style.setProperty('--accent-selection', preset.glow.replace('0.3)', '0.2)'))
  root.style.setProperty('--terminal-selection', preset.glow.replace('0.3)', '0.2)'))
  root.style.setProperty('--glass-border-accent', preset.glow)
}
