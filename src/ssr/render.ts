// Server rendering entry.

import { render } from '../scene/render'
import type { RenderHandle } from '../scene/render'
import { BASE_CSS } from '../web/style'
import { StringHost } from './string-host'

type Factory = () => unknown

/**
 * Render a component factory to an HTML fragment. Installs a string host,
 * renders synchronously, disposes the tree, and restores the previous host.
 */
export function renderToString(factory: Factory): string {
  const host = new StringHost()
  const g = globalThis as unknown as Record<string, unknown>
  const previous = g['__tardis_flush']
  g['__tardis_flush'] = host.flush
  let handle: RenderHandle | null = null
  try {
    handle = render(factory)
    return host.html()
  } finally {
    handle?.dispose()
    if (previous === undefined) delete g['__tardis_flush']
    else g['__tardis_flush'] = previous
  }
}

export interface DocumentOptions {
  title?: string
  head?: string
  script?: string
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

/** Wrap a server fragment in a document with the required base styles. */
export function renderDocument(
  bodyHtml: string,
  options: DocumentOptions = {}
): string {
  const title = escapeText(options.title ?? 'Tardis app')
  const head = options.head ?? ''
  const script = options.script
    ? `<script src="${escapeAttr(options.script)}"></script>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>${title}</title>
<style>
${BASE_CSS}
html, body, #app { height: 100%; margin: 0; }
body {
  background: #0a0a0a;
  color: #ededed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
${head}
</head>
<body>
<div id="app">${bodyHtml}</div>
${script}
</body>
</html>
`
}
