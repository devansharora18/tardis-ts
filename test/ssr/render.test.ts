import { describe, expect, it } from 'vitest'
import { createSignal, dynamic, jsx } from '../../src/scene/index'
import { renderDocument, renderToString } from '../../src/ssr/index'
import { BASE_CSS } from '../../src/web/style'

describe('renderToString', () => {
  it('serializes semantic markup, styles, text, and aria', () => {
    const App = () =>
      jsx(
        'div',
        { style: { padding: 16 } },
        jsx('h1', {}, 'Hello & <'),
        jsx('p', { role: 'note', 'aria-label': 'Body' }, 'Line')
      )
    const html = renderToString(App)
    expect(html).toContain('<div data-tardis-ts="0" style="display: flex;')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello &amp; &lt;')
    expect(html).toContain('padding: 16px')
    expect(html).toContain('role="note"')
    expect(html).toContain('aria-label="Body"')
  })

  it('renders dynamic values and restores the host global', () => {
    const App = () => {
      const [name] = createSignal('Ada')
      return jsx('p', {}, 'Name: ', dynamic(() => name()))
    }
    const html = renderToString(App)
    expect(html).toContain('Name: Ada')
    const g = globalThis as unknown as Record<string, unknown>
    expect(g['__tardis_ts_flush']).toBeUndefined()
  })

  it('escapes document titles', () => {
    const html = renderDocument('<p>x</p>', { title: 'A & <B>' })
    expect(html).toContain('<title>A &amp; &lt;B&gt;</title>')
    expect(html).toContain(BASE_CSS)
    expect(html).toContain('<div id="app"><p>x</p></div>')
  })
})
