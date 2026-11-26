// Client takeover for server-rendered markup.
//
// The scene runtime emits direct DOM operations, so there is no virtual tree to
// adopt. Hydration here is a deterministic remount: the factory renders into a
// detached staging container, server and client text are compared as a sanity
// check, then the client root replaces the server nodes and the WebHost moves
// its listeners to the real container. No flash if the markup is equivalent.
//
// Not implemented: adopting the existing server nodes in place. A content
// mismatch warns but still mounts.

import { render } from '../scene/render'
import type { RenderHandle } from '../scene/render'
import { createWebHost } from '../web/dom'

export interface HydrateOptions {
  onMismatch?: (server: string, client: string) => void
}

export interface HydratedApp {
  root: HTMLElement
  dispose(): void
}

export function hydrate(
  factory: () => unknown,
  container: Element,
  options: HydrateOptions = {}
): HydratedApp {
  if (typeof document === 'undefined') {
    throw new Error('tardis: hydrate needs a DOM; use renderToString on the server')
  }
  const staging = document.createElement('div')
  const host = createWebHost({ container: staging })
  const handle: RenderHandle = render(factory)

  const serverText = container.textContent ?? ''
  const clientText = staging.textContent ?? ''
  if (serverText !== clientText) {
    if (options.onMismatch) options.onMismatch(serverText, clientText)
    else {
      console.warn(
        '[tardis] hydration content mismatch; replacing server markup'
      )
    }
  }

  if (!(container instanceof HTMLElement)) {
    throw new Error('tardis: hydrate needs an HTMLElement container')
  }
  host.setContainer(container, true)

  return {
    root: host.getRootElement(),
    dispose(): void {
      handle.dispose()
      host.dispose()
    },
  }
}
