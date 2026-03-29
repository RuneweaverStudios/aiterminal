/**
 * useVirtualMessages — lightweight message windowing for large conversations.
 *
 * Instead of rendering 500+ message components, only renders a window
 * of messages around the current scroll position. No external dependency
 * needed for this simple approach.
 *
 * For full virtual scrolling with pixel-accurate positioning, upgrade
 * to react-virtuoso later.
 */

import { useState, useMemo, useCallback } from 'react'

export interface VirtualMessage {
  readonly id: string
  readonly role: 'user' | 'assistant' | 'system'
  readonly content: string
  readonly timestamp: number
  readonly [key: string]: unknown
}

export interface UseVirtualMessagesOptions {
  readonly windowSize?: number
}

export interface UseVirtualMessagesReturn {
  readonly visibleMessages: readonly VirtualMessage[]
  readonly totalCount: number
  readonly isVirtualized: boolean
  readonly scrollToTop: () => void
  readonly scrollToBottom: () => void
}

const DEFAULT_WINDOW = 100

export function useVirtualMessages(
  messages: readonly VirtualMessage[],
  options?: UseVirtualMessagesOptions,
): UseVirtualMessagesReturn {
  const windowSize = options?.windowSize ?? DEFAULT_WINDOW
  const [scrollOffset, setScrollOffset] = useState<'top' | 'bottom'>('bottom')

  const isVirtualized = messages.length > windowSize

  const visibleMessages = useMemo(() => {
    if (!isVirtualized) return messages

    if (scrollOffset === 'top') {
      return messages.slice(0, windowSize)
    }

    // Default: show the most recent messages
    return messages.slice(messages.length - windowSize)
  }, [messages, windowSize, isVirtualized, scrollOffset])

  const scrollToTop = useCallback(() => {
    setScrollOffset('top')
  }, [])

  const scrollToBottom = useCallback(() => {
    setScrollOffset('bottom')
  }, [])

  return {
    visibleMessages,
    totalCount: messages.length,
    isVirtualized,
    scrollToTop,
    scrollToBottom,
  }
}
