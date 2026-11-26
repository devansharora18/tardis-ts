// Client takeover for server-rendered markup.
//
// The web host runs in adopt mode: patch `create` ops reuse the server nodes
// with the same `data-tardis-ts` id, and style/text/aria ops update them in place.
// Unclaimed server nodes are removed after the first flush. Text is compared
// before and after the takeover to report a mismatch.

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
    throw new Error('tardis-ts: hydrate needs a DOM; use renderToString on the server')
  }
  if (!(container instanceof HTMLElement)) {
    throw new Error('tardis-ts: hydrate needs an HTMLElement container')
  }
  const serverText = container.textContent ?? ''
  if (!container.querySelector('[data-tardis-ts="0"]')) {
    container.replaceChildren()
  }
  const host = createWebHost({ container, adopt: true })
  const handle: RenderHandle = render(factory)

  const clientText = container.textContent ?? ''
  if (serverText !== clientText) {
    if (options.onMismatch) options.onMismatch(serverText, clientText)
    else {
      console.warn('[tardis] hydration content mismatch; patched server markup')
    }
  }

  return {
    root: host.getRootElement(),
    dispose(): void {
      handle.dispose()
      host.dispose()
    },
  }
}
