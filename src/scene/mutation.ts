// Async mutation with loading/error/data state.
//
// Concurrent mutations are allowed; the latest call wins for state updates and
// an older result is ignored. Disposal aborts the active request and stops
// state writes.

import { createSignal, onCleanup } from './signals'

export interface MutationOptions<TInput, TOutput> {
  onSuccess?: (value: TOutput, input: TInput) => void
  onError?: (error: Error, input: TInput) => void
  initial?: TOutput
}

export interface Mutation<TInput, TOutput> {
  data: () => TOutput | undefined
  error: () => Error | undefined
  loading: () => boolean
  mutate: (input: TInput) => Promise<TOutput | undefined>
  reset: () => void
  dispose: () => void
}

export function createMutation<TInput, TOutput>(
  run: (input: TInput, signal?: AbortSignal) => Promise<TOutput>,
  options: MutationOptions<TInput, TOutput> = {}
): Mutation<TInput, TOutput> {
  const [data, setData] = createSignal<TOutput | undefined>(options.initial)
  const [error, setError] = createSignal<Error | undefined>(undefined)
  const [loading, setLoading] = createSignal(false)
  let disposed = false
  let token = 0
  let controller: AbortController | null = null

  const mutate = async (input: TInput): Promise<TOutput | undefined> => {
    if (disposed) return undefined
    controller?.abort()
    controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null
    const current = ++token
    setLoading(true)
    setError(undefined)
    try {
      const value = await run(input, controller?.signal)
      if (disposed || current !== token) return undefined
      setData(value)
      setLoading(false)
      options.onSuccess?.(value, input)
      return value
    } catch (reason) {
      if (disposed || current !== token) return undefined
      const next = reason instanceof Error ? reason : new Error(String(reason))
      setError(next)
      setLoading(false)
      options.onError?.(next, input)
      return undefined
    }
  }

  const reset = (): void => {
    setData(options.initial)
    setError(undefined)
    setLoading(false)
  }

  const dispose = (): void => {
    disposed = true
    token++
    controller?.abort()
    controller = null
  }

  onCleanup(dispose)

  return { data, error, loading, mutate, reset, dispose }
}
