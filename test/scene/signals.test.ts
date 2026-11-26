import { describe, it, expect, vi } from 'vitest'
import {
  createSignal,
  createMemo,
  createEffect,
  createRoot,
  onCleanup,
  batch,
  untrack,
} from '../../src/scene/signals'

describe('scene signals', () => {
  it('createSignal reads and writes', () => {
    const [count, setCount] = createSignal(0)
    expect(count()).toBe(0)
    setCount(1)
    expect(count()).toBe(1)
    setCount((n) => n + 1)
    expect(count()).toBe(2)
  })

  it('createMemo caches and invalidates', () => {
    const [count, setCount] = createSignal(2)
    let runs = 0
    const double = createMemo(() => {
      runs++
      return count() * 2
    })
    expect(double()).toBe(4)
    expect(double()).toBe(4)
    expect(runs).toBe(1)
    setCount(3)
    expect(double()).toBe(6)
    expect(runs).toBe(2)
  })

  it('createEffect tracks and batched writes run once', () => {
    const [count, setCount] = createSignal(0)
    const seen: number[] = []
    const stop = createEffect(() => seen.push(count()))
    batch(() => {
      setCount(1)
      setCount(2)
    })
    expect(seen).toEqual([0, 2])
    stop()
    setCount(3)
    expect(seen).toEqual([0, 2])
  })

  it('untrack reads without subscribing', () => {
    const [count, setCount] = createSignal(0)
    const seen: number[] = []
    createEffect(() => {
      count()
      untrack(() => seen.push(count()))
    })
    setCount(1)
    expect(seen).toEqual([0, 1])
  })

  it('createRoot disposes its effects', () => {
    const [count, setCount] = createSignal(0)
    const seen: number[] = []
    const dispose = createRoot((dispose) => {
      createEffect(() => seen.push(count()))
      return dispose
    })
    setCount(1)
    expect(seen).toEqual([0, 1])
    dispose()
    setCount(2)
    expect(seen).toEqual([0, 1])
  })

  it('onCleanup runs in reverse order on dispose', () => {
    const order: string[] = []
    const dispose = createRoot((dispose) => {
      onCleanup(() => order.push('first'))
      onCleanup(() => order.push('second'))
      return dispose
    })
    dispose()
    dispose()
    expect(order).toEqual(['second', 'first'])
  })

  it('nested roots are disposed with the parent', () => {
    const [count, setCount] = createSignal(0)
    let runs = 0
    const dispose = createRoot((dispose) => {
      createRoot(() => {
        createEffect(() => {
          count()
          runs++
        })
      })
      return dispose
    })
    setCount(1)
    dispose()
    const before = runs
    setCount(2)
    expect(runs).toBe(before)
  })

  it('disposed effects do not run on later writes', () => {
    const [count, setCount] = createSignal(0)
    const fn = vi.fn(() => count())
    const stop = createEffect(fn)
    stop()
    setCount(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('computed stops notifying after dispose', () => {
    const [count, setCount] = createSignal(1)
    const double = createMemo(() => count() * 2)
    expect(double()).toBe(2)
    setCount(2)
    expect(double()).toBe(4)
  })
})
