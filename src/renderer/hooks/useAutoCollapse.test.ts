import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoCollapse } from './useAutoCollapse'

describe('useAutoCollapse', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts expanded', () => {
    const { result } = renderHook(() => useAutoCollapse({ delayMs: 3000 }))
    expect(result.current.isExpanded).toBe(true)
  })

  it('collapses after delay', () => {
    const { result } = renderHook(() => useAutoCollapse({ delayMs: 3000 }))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.isExpanded).toBe(false)
  })

  it('does not collapse before delay', () => {
    const { result } = renderHook(() => useAutoCollapse({ delayMs: 3000 }))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.isExpanded).toBe(true)
  })

  it('stays expanded when disabled', () => {
    const { result } = renderHook(() =>
      useAutoCollapse({ delayMs: 3000, enabled: false }),
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.isExpanded).toBe(true)
  })

  it('toggle() flips expanded state', () => {
    const { result } = renderHook(() => useAutoCollapse({ delayMs: 3000 }))

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isExpanded).toBe(false)

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isExpanded).toBe(true)
  })

  it('manual toggle cancels auto-collapse timer', () => {
    const { result } = renderHook(() => useAutoCollapse({ delayMs: 3000 }))

    // Manually collapse
    act(() => {
      result.current.toggle()
    })

    // Advance past timer — should not re-expand
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.isExpanded).toBe(false)
  })

  it('respects custom delay', () => {
    const { result } = renderHook(() => useAutoCollapse({ delayMs: 1000 }))

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.isExpanded).toBe(false)
  })
})
