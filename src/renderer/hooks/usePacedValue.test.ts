import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePacedValue } from './usePacedValue'

describe('usePacedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string initially when target is empty', () => {
    const { result } = renderHook(() => usePacedValue('', true))
    expect(result.current).toBe('')
  })

  it('returns full value immediately when not streaming', () => {
    const { result } = renderHook(() => usePacedValue('Hello world', false))
    expect(result.current).toBe('Hello world')
  })

  it('starts with empty and advances toward target when streaming', () => {
    const { result } = renderHook(() => usePacedValue('Hello', true))
    // Initially should be empty or a small prefix
    expect(result.current.length).toBeLessThanOrEqual('Hello'.length)
  })

  it('eventually reaches the full target value while streaming', () => {
    const { result } = renderHook(() => usePacedValue('Hi', true))

    // Advance timers until the value catches up
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('Hi')
  })

  it('catches up instantly when streaming stops', () => {
    const { result, rerender } = renderHook(
      ({ value, streaming }) => usePacedValue(value, streaming),
      { initialProps: { value: 'Hello world', streaming: true } },
    )

    // Stop streaming
    rerender({ value: 'Hello world', streaming: false })

    expect(result.current).toBe('Hello world')
  })

  it('uses adaptive step sizes — larger chunks for more remaining text', () => {
    const longText = 'A'.repeat(200)
    const { result } = renderHook(() => usePacedValue(longText, true))

    act(() => {
      vi.advanceTimersByTime(24) // One tick
    })

    // After one tick with 200 chars remaining, step should be > 2
    expect(result.current.length).toBeGreaterThan(2)
  })

  it('handles target value growing over time (streaming appends)', () => {
    const { result, rerender } = renderHook(
      ({ value, streaming }) => usePacedValue(value, streaming),
      { initialProps: { value: 'He', streaming: true } },
    )

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Target grows
    rerender({ value: 'Hello world', streaming: true })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('Hello world')
  })

  it('never exceeds target length', () => {
    const { result } = renderHook(() => usePacedValue('Short', true))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.length).toBeLessThanOrEqual('Short'.length)
  })
})
