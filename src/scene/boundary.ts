// Render-time error boundary.
//
// The content factory is called inside a dynamic region and guarded by
// try/catch, so component/render errors become a fallback instead of a blank
// screen. Errors thrown later inside child effects are caught and logged by the
// signal graph, not routed here yet.

import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { DynamicValue, SceneNode } from './types'

export interface BoundaryProps {
  content: () => SceneNode | null
  fallback?: (error: Error, reset: () => void) => SceneNode
  onError?: (error: Error) => void
  onReset?: () => void
}

function message(error: Error): SceneNode {
  return jsx(
    'div',
    {
      role: 'alert',
      style: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#2a1214',
        color: '#ff7b72',
        fontSize: 14,
      },
    },
    `Something went wrong: ${error.message}`
  )
}

export function Boundary(props: BoundaryProps): DynamicValue {
  const [error, setError] = createSignal<Error | null>(null)
  const [nonce, setNonce] = createSignal(0)

  const reset = (): void => {
    setError(null)
    setNonce((value) => value + 1)
    props.onReset?.()
  }

  return dynamic(() => {
    nonce()
    const current = error()
    if (current) {
      return props.fallback ? props.fallback(current, reset) : message(current)
    }
    try {
      return props.content()
    } catch (reason) {
      const next =
        reason instanceof Error ? reason : new Error(String(reason))
      setError(next)
      props.onError?.(next)
      return props.fallback ? props.fallback(next, reset) : message(next)
    }
  })
}
