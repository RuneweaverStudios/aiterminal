import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVirtualMessages, type VirtualMessage } from './useVirtualMessages'

function createMessages(count: number): readonly VirtualMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content: `Message ${i}`,
    timestamp: Date.now() + i * 1000,
  }))
}

describe('useVirtualMessages', () => {
  it('returns all messages when count is small', () => {
    const messages = createMessages(5)
    const { result } = renderHook(() => useVirtualMessages(messages))

    expect(result.current.visibleMessages).toHaveLength(5)
  })

  it('returns window slice for large message lists', () => {
    const messages = createMessages(500)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 50 }),
    )

    // Should only return up to windowSize messages
    expect(result.current.visibleMessages.length).toBeLessThanOrEqual(50)
  })

  it('includes the most recent messages', () => {
    const messages = createMessages(100)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 20 }),
    )

    const visible = result.current.visibleMessages
    const lastVisible = visible[visible.length - 1]
    const lastOriginal = messages[messages.length - 1]

    expect(lastVisible.id).toBe(lastOriginal.id)
  })

  it('totalCount reflects actual message count', () => {
    const messages = createMessages(200)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 30 }),
    )

    expect(result.current.totalCount).toBe(200)
  })

  it('isVirtualized returns true when messages exceed window', () => {
    const messages = createMessages(100)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 50 }),
    )

    expect(result.current.isVirtualized).toBe(true)
  })

  it('isVirtualized returns false when messages fit in window', () => {
    const messages = createMessages(10)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 50 }),
    )

    expect(result.current.isVirtualized).toBe(false)
  })

  it('scrollToTop shows earlier messages', () => {
    const messages = createMessages(200)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 50 }),
    )

    act(() => {
      result.current.scrollToTop()
    })

    const firstVisible = result.current.visibleMessages[0]
    expect(firstVisible.id).toBe('msg-0')
  })

  it('scrollToBottom shows latest messages', () => {
    const messages = createMessages(200)
    const { result } = renderHook(() =>
      useVirtualMessages(messages, { windowSize: 50 }),
    )

    act(() => {
      result.current.scrollToTop()
    })

    act(() => {
      result.current.scrollToBottom()
    })

    const visible = result.current.visibleMessages
    const lastVisible = visible[visible.length - 1]
    expect(lastVisible.id).toBe('msg-199')
  })

  it('handles empty message array', () => {
    const { result } = renderHook(() => useVirtualMessages([]))

    expect(result.current.visibleMessages).toHaveLength(0)
    expect(result.current.totalCount).toBe(0)
    expect(result.current.isVirtualized).toBe(false)
  })

  it('updates when messages change', () => {
    const { result, rerender } = renderHook(
      ({ msgs }) => useVirtualMessages(msgs, { windowSize: 50 }),
      { initialProps: { msgs: createMessages(10) } },
    )

    expect(result.current.totalCount).toBe(10)

    rerender({ msgs: createMessages(100) })

    expect(result.current.totalCount).toBe(100)
  })
})
