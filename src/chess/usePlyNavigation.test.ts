import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePlyNavigation } from './usePlyNavigation'

describe('usePlyNavigation', () => {
  it('starts pinned to the live end', () => {
    const { result } = renderHook(() => usePlyNavigation(4))
    expect(result.current.ply).toBe(4)
    expect(result.current.isLive).toBe(true)
  })

  it('steps backward and forward through plies', () => {
    const { result } = renderHook(() => usePlyNavigation(4))

    act(() => result.current.previous())
    expect(result.current.ply).toBe(3)
    expect(result.current.isLive).toBe(false)

    act(() => result.current.first())
    expect(result.current.ply).toBe(0)

    act(() => result.current.next())
    expect(result.current.ply).toBe(1)
  })

  it('re-pins to live when stepping onto the last move', () => {
    const { result } = renderHook(() => usePlyNavigation(2))
    act(() => result.current.goTo(1))
    expect(result.current.isLive).toBe(false)
    act(() => result.current.next())
    expect(result.current.ply).toBe(2)
    expect(result.current.isLive).toBe(true)
  })

  it('keeps a reviewed ply in range when the game shrinks', () => {
    const { result, rerender } = renderHook(({ count }) => usePlyNavigation(count), {
      initialProps: { count: 6 },
    })
    act(() => result.current.goTo(5))
    expect(result.current.ply).toBe(5)

    rerender({ count: 3 })
    expect(result.current.ply).toBe(3)
  })

  it('follows the live end as the game grows', () => {
    const { result, rerender } = renderHook(({ count }) => usePlyNavigation(count), {
      initialProps: { count: 2 },
    })
    expect(result.current.ply).toBe(2)
    rerender({ count: 5 })
    expect(result.current.ply).toBe(5)
  })
})
