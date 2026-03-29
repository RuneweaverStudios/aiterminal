/**
 * ProcessBadge — color-coded 3-letter badge for tool/process type identification.
 *
 * Uses CSS custom property --step-accent so child elements inherit the color.
 *
 * Inspired by Agent Zero's step badge system.
 */

import type { FC } from 'react'

export const BADGE_COLORS: Record<string, string> = {
  bash: '#ba68c8',     // purple — code execution
  run: '#ba68c8',      // purple — alias for bash
  read: '#38bdf8',     // cyan — file read
  write: '#22c55e',    // green — file write
  edit: '#fbbf24',     // amber — file edit
  grep: '#818cf8',     // indigo — search
  glob: '#818cf8',     // indigo — pattern search
  list: '#818cf8',     // indigo — directory list
  thinking: '#38bdf8', // cyan — LLM generation
  error: '#ef4444',    // red — error
  warning: '#f97316',  // orange — warning
  done: '#22c55e',     // green — completion
  mcp: '#fbbf24',      // amber — MCP protocol
  subagent: '#14b8a6', // teal — sub-agent
}

const BADGE_LABELS: Record<string, string> = {
  bash: 'RUN',
  run: 'RUN',
  read: 'READ',
  write: 'WRT',
  edit: 'EDT',
  grep: 'SRC',
  glob: 'SRC',
  list: 'LST',
  thinking: 'GEN',
  error: 'ERR',
  warning: 'WRN',
  done: 'END',
  mcp: 'MCP',
  subagent: 'SUB',
}

const DEFAULT_COLOR = '#6b7280' // gray

export interface ProcessBadgeProps {
  readonly type: string
  readonly className?: string
}

export const ProcessBadge: FC<ProcessBadgeProps> = ({ type, className }) => {
  const color = BADGE_COLORS[type] ?? DEFAULT_COLOR
  const label = BADGE_LABELS[type] ?? type.slice(0, 3).toUpperCase()

  return (
    <span
      className={`process-badge ${className ?? ''}`}
      style={{
        '--step-accent': color,
        color,
        borderColor: color,
      } as React.CSSProperties}
    >
      {label}
    </span>
  )
}
