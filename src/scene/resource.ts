// Async resource with loading/error/refetch state.
//
// The last request wins: a stale response is ignored if a newer refetch has
// started. Disposal stops state updates and is registered with the owner.

import { createSignal, onCleanup } from './signals'

export interface Resource<T> {
  data: () => T | undefined
  error: () => Error | undefined
  loading: () => boolean
  refetch: () => void
  dispose: () => void
}

export function createResource<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options: { initial?: T } = {}
): Resource<T> {
  const [data, setData] = createSignal<T | undefined>(options.initial)
  const [error, setError] = createSignal<Error | undefined>(undefined)
  const [loading, setLoading] = createSignal(true)
  let disposed = false
  let token = 0
  let controller: AbortController | null = null

  const load = (): void => {
    if (disposed) return
    controller?.abort()
    controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const current = ++token
    setLoading(true)
    setError(undefined)
    fetcher(controller?.signal ?? undefined).then(
      (value) => {
        if (disposed || current !== token) return
        setData(value)
        setLoading(false)
      },
      (reason: unknown) => {
        if (disposed || current !== token) return
        setError(reason instanceof Error ? reason : new Error(String(reason)))
        setLoading(false)
      }
    )
  }

  const dispose = (): void => {
    disposed = true
    token++
    controller?.abort()
    controller = null
  }

  onCleanup(dispose)
  load()

  return { data, error, loading, refetch: load, dispose }
}
