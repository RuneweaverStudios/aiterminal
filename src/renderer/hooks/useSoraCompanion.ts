/**
 * useSoraCompanion — Sora wake/sleep cycle for Claude Code sessions.
 *
 * SLEEP: Sora monitors Claude Code logs + terminal output silently.
 * WAKE:  When Claude finishes a task (idle after activity), Sora:
 *        1. Reads Claude Code session logs for clean context
 *        2. Summarizes what Claude just did
 *        3. Asks "What do you want to do next?"
 *        4. Waits for user response (text or voice)
 *        5. Relays the response to Claude Code via terminal
 *        6. Goes back to sleep
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatMessage } from '@/types/chat'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SoraState = 'sleeping' | 'summarizing' | 'listening' | 'relaying'

export interface UseSoraCompanionReturn {
  readonly messages: ReadonlyArray<ChatMessage>
  readonly isStreaming: boolean
  readonly soraState: SoraState
  readonly sendMessage: (text: string) => Promise<void>
  readonly generateStatus: () => Promise<void>
  readonly clearMessages: () => void
}

export interface UseSoraCompanionOptions {
  readonly getActiveSessionId: () => string | null
  readonly onSpeak?: (text: string) => void
  readonly onBubble?: (text: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MESSAGES = 30
const AUTO_STATUS_COOLDOWN_MS = 30_000
const IDLE_THRESHOLD_MS = 5_000
const ACTIVITY_CHAR_THRESHOLD = 500
const MAX_LOG_CONTEXT_CHARS = 3000
const MAX_PTY_BUFFER = 2000

const STATUS_AND_PROMPT = `Based on the Claude Code session log below, do TWO things:
1. Summarize what Claude just did in 1-2 sentences (be specific — file names, test results, errors, commands)
2. End with: "What would you like to do next?"

CLAUDE CODE SESSION LOG (most recent messages):
---
{CONTEXT}
---`

const SORA_SYSTEM_PROMPT = `You are Sora, a friendly AI companion watching the user's Claude Code session.

RECENT CONTEXT:
---
{CONTEXT}
---

You can:
1. Answer questions about what Claude is doing or the project state
2. Chat casually — architecture, ideas, opinions
3. Relay instructions to Claude Code — wrap what should be typed in [RELAY]instruction here[/RELAY]

Only use [RELAY] when the user wants Claude to do something. For questions and chat, just answer.
Keep responses to 1-3 sentences.`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let msgCounter = 0

function createMsg(role: 'user' | 'assistant', content: string): ChatMessage {
  msgCounter += 1
  return {
    id: `sora-${Date.now()}-${msgCounter}`,
    role,
    content,
    timestamp: Date.now(),
  }
}

function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '')
    .replace(/\r/g, '')
}

function extractRelay(text: string): { relay: string | null; display: string } {
  const match = text.match(/\[RELAY\]([\s\S]*?)\[\/RELAY\]/)
  if (!match) return { relay: null, display: text }

  const relay = match[1].trim()
  const display = text.replace(/\[RELAY\][\s\S]*?\[\/RELAY\]/, '').trim()
  return { relay, display: display || `Sent to Claude: "${relay}"` }
}

/**
 * Extract readable context from Claude Code JSONL log messages.
 * Picks out assistant text, tool calls, and results — skips system noise.
 */
function formatLogMessages(messages: any[]): string {
  const parts: string[] = []
  let charCount = 0

  // Walk backwards from most recent, collect until we hit the char limit
  for (let i = messages.length - 1; i >= 0 && charCount < MAX_LOG_CONTEXT_CHARS; i--) {
    const msg = messages[i]
    let line = ''

    if (msg.role === 'assistant' && msg.content) {
      const text = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
          : ''
      if (text.trim()) line = `Claude: ${text.trim().slice(0, 500)}`
    } else if (msg.role === 'user' && msg.content) {
      const text = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
          : ''
      if (text.trim()) line = `User: ${text.trim().slice(0, 200)}`
    } else if (msg.type === 'tool_result' || msg.role === 'tool') {
      const text = typeof msg.content === 'string' ? msg.content : ''
      if (text.trim()) line = `Tool result: ${text.trim().slice(0, 300)}`
    }

    if (line) {
      parts.unshift(line)
      charCount += line.length
    }
  }

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSoraCompanion(options: UseSoraCompanionOptions): UseSoraCompanionReturn {
  const { getActiveSessionId, onSpeak, onBubble } = options

  const [messages, setMessages] = useState<ReadonlyArray<ChatMessage>>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [soraState, setSoraState] = useState<SoraState>('sleeping')

  // Context sources
  const ptyBufferRef = useRef('')         // Fallback: raw PTY output (normal terminal)
  const claudeLogRef = useRef<any[]>([])  // Primary: Claude Code JSONL messages

  // Activity tracking
  const charsSinceWakeRef = useRef(0)
  const lastWakeTimeRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soraStateRef = useRef<SoraState>('sleeping')
  soraStateRef.current = soraState

  // Stable refs
  const onSpeakRef = useRef(onSpeak)
  onSpeakRef.current = onSpeak
  const onBubbleRef = useRef(onBubble)
  onBubbleRef.current = onBubble

  /**
   * Get the best available context string for AI queries.
   * Prefers Claude Code logs; falls back to PTY buffer.
   */
  const getContext = useCallback((): string => {
    if (claudeLogRef.current.length > 0) {
      return formatLogMessages(claudeLogRef.current)
    }
    return ptyBufferRef.current.slice(-1500) || '(no terminal output captured)'
  }, [])

  // ---------------------------------------------------------------------------
  // AI query helper
  // ---------------------------------------------------------------------------

  const queryAI = useCallback(async (
    systemPrompt: string,
    userText: string,
    context: ReadonlyArray<{ role: string; content: string }>,
  ): Promise<string> => {
    const api = window.electronAPI
    if (!api?.aiQueryStream) return '(AI not available)'

    const prompt = systemPrompt.replace('{CONTEXT}', getContext())

    return new Promise<string>((resolve) => {
      let accumulated = ''

      api.aiQueryStream(
        {
          prompt: userText ? `${prompt}\n\nUser: ${userText}` : prompt,
          taskType: 'general',
          context: context.slice(-6).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        },
        (payload) => {
          if (payload.chunk) accumulated += payload.chunk
          if (payload.done) resolve(accumulated.trim())
          if (payload.error) resolve(`Sorry, something went wrong.`)
        },
      )
    })
  }, [getContext])

  // ---------------------------------------------------------------------------
  // Wake cycle
  // ---------------------------------------------------------------------------

  const wake = useCallback(async () => {
    if (soraStateRef.current !== 'sleeping') return
    if (isStreaming) return

    const now = Date.now()
    if (now - lastWakeTimeRef.current < AUTO_STATUS_COOLDOWN_MS) return
    lastWakeTimeRef.current = now

    // Fetch latest Claude Code logs before summarizing
    try {
      const api = window.electronAPI
      if (api?.getClaudeCodeLog) {
        const result = await api.getClaudeCodeLog(30)
        if (result.success && result.messages) {
          claudeLogRef.current = result.messages
        }
      }
    } catch { /* use whatever we have */ }

    setSoraState('summarizing')
    setIsStreaming(true)

    try {
      const response = await queryAI(STATUS_AND_PROMPT, '', [])
      const statusMsg = createMsg('assistant', response)
      setMessages(prev => [...prev, statusMsg].slice(-MAX_MESSAGES))
      onSpeakRef.current?.(response)
      onBubbleRef.current?.(response)
      setSoraState('listening')
    } catch {
      setSoraState('sleeping')
    } finally {
      setIsStreaming(false)
    }

    charsSinceWakeRef.current = 0
  }, [isStreaming, queryAI])

  // ---------------------------------------------------------------------------
  // Subscribe to PTY output (activity tracking + fallback context)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onAnySessionData) return

    const unsub = api.onAnySessionData((_sessionId, data) => {
      const clean = stripAnsi(data)
      ptyBufferRef.current = (ptyBufferRef.current + clean).slice(-MAX_PTY_BUFFER)
      charsSinceWakeRef.current += clean.length

      // Only track idle when sleeping
      if (soraStateRef.current !== 'sleeping') return

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        if (charsSinceWakeRef.current > ACTIVITY_CHAR_THRESHOLD) {
          wake()
        }
      }, IDLE_THRESHOLD_MS)
    })

    return () => {
      unsub?.()
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [wake])

  // ---------------------------------------------------------------------------
  // Subscribe to Claude Code log updates (live context)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.startClaudeCodeLogWatcher || !api?.onClaudeCodeLogUpdated) return

    api.startClaudeCodeLogWatcher().catch(() => {})

    const unsub = api.onClaudeCodeLogUpdated((data) => {
      if (data.messages) {
        claudeLogRef.current = data.messages
      }
    })

    return () => {
      unsub?.()
      api.stopClaudeCodeLogWatcher?.().catch(() => {})
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const userMsg = createMsg('user', trimmed)
    setMessages(prev => [...prev, userMsg].slice(-MAX_MESSAGES))
    setIsStreaming(true)

    const wasListening = soraStateRef.current === 'listening'
    if (wasListening) setSoraState('relaying')

    try {
      // Refresh Claude logs before responding
      try {
        const api = window.electronAPI
        if (api?.getClaudeCodeLog) {
          const result = await api.getClaudeCodeLog(30)
          if (result.success && result.messages) {
            claudeLogRef.current = result.messages
          }
        }
      } catch { /* use cached */ }

      const context = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const response = await queryAI(SORA_SYSTEM_PROMPT, trimmed, context)

      const { relay, display } = extractRelay(response)

      if (relay) {
        const sessionId = getActiveSessionId()
        if (sessionId && window.electronAPI?.writeToSession) {
          window.electronAPI.writeToSession(sessionId, relay + '\n')
        }
      }

      const assistantMsg = createMsg('assistant', display)
      setMessages(prev => [...prev, assistantMsg].slice(-MAX_MESSAGES))
      onSpeakRef.current?.(display)
      onBubbleRef.current?.(display)

      if (relay || wasListening) {
        setSoraState('sleeping')
      }
    } catch {
      const errMsg = createMsg('assistant', 'Sorry, something went wrong.')
      setMessages(prev => [...prev, errMsg].slice(-MAX_MESSAGES))
      setSoraState('sleeping')
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, messages, queryAI, getActiveSessionId])

  // ---------------------------------------------------------------------------
  // Manual status
  // ---------------------------------------------------------------------------

  const generateStatus = useCallback(async () => {
    lastWakeTimeRef.current = Date.now()
    charsSinceWakeRef.current = 0

    // Refresh logs
    try {
      const api = window.electronAPI
      if (api?.getClaudeCodeLog) {
        const result = await api.getClaudeCodeLog(30)
        if (result.success && result.messages) {
          claudeLogRef.current = result.messages
        }
      }
    } catch { /* use cached */ }

    setSoraState('summarizing')
    setIsStreaming(true)
    try {
      const response = await queryAI(STATUS_AND_PROMPT, '', [])
      const statusMsg = createMsg('assistant', response)
      setMessages(prev => [...prev, statusMsg].slice(-MAX_MESSAGES))
      onSpeakRef.current?.(response)
      onBubbleRef.current?.(response)
      setSoraState('listening')
    } catch {
      setSoraState('sleeping')
    } finally {
      setIsStreaming(false)
    }
  }, [queryAI])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSoraState('sleeping')
  }, [])

  return {
    messages,
    isStreaming,
    soraState,
    sendMessage,
    generateStatus,
    clearMessages,
  }
}
