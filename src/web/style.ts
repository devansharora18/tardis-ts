// Shared web style mapping and element defaults.
//
// The DOM host and the server renderer both use these tables so the client and
// server produce the same inline styles and semantic elements.

export const CSS_PROPERTIES: Record<string, string> = {
  width: 'width',
  height: 'height',
  minWidth: 'min-width',
  maxWidth: 'max-width',
  minHeight: 'min-height',
  maxHeight: 'max-height',
  padding: 'padding',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
  margin: 'margin',
  marginTop: 'margin-top',
  marginRight: 'margin-right',
  marginBottom: 'margin-bottom',
  marginLeft: 'margin-left',
  flexDirection: 'flex-direction',
  justifyContent: 'justify-content',
  alignItems: 'align-items',
  gap: 'gap',
  flexGrow: 'flex-grow',
  flexShrink: 'flex-shrink',
  flexWrap: 'flex-wrap',
  position: 'position',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
  backgroundColor: 'background-color',
  borderRadius: 'border-radius',
  opacity: 'opacity',
  overflow: 'overflow',
  whiteSpace: 'white-space',
  overflowWrap: 'overflow-wrap',
  display: 'display',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontFamily: 'font-family',
  color: 'color',
  lineHeight: 'line-height',
  textAlign: 'text-align',
  textOverflow: 'text-overflow',
}

export const PIXEL_PROPERTIES = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gap',
  'top',
  'right',
  'bottom',
  'left',
  'borderRadius',
  'fontSize',
  'lineHeight',
])

export const UNITLESS_PROPERTIES = new Set([
  'flexGrow',
  'flexShrink',
  'opacity',
  'fontWeight',
])

export const BASE_CSS = [
  '[data-tardis]{box-sizing:border-box}',
  '[data-tardis="0"]{width:100%;min-height:100vh}',
  'button[data-tardis]{border:0;font:inherit;cursor:pointer}',
  'ul[data-tardis]{margin:0;padding:0;list-style:none}',
  'li[data-tardis]{list-style:none}',
].join('')

export function rootStyle(
  background = '#0a0a0a',
  color = '#ededed'
): Record<string, string> {
  return {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    backgroundColor: background,
    color,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  }
}

export function defaultStyle(kind: string, tag: string): Record<string, string> {
  if (kind === 'fragment') return { display: 'contents' }
  if (kind === 'image') return { display: 'block' }
  if (kind === 'text') {
    return {
      display: 'block',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word',
      minWidth: '0',
      margin: '0',
    }
  }
  const style: Record<string, string> = {
    display: 'flex',
    flexDirection: 'column',
  }
  if (kind === 'scroll' || tag === 'scroll') style.overflow = 'auto'
  return style
}

export function toCssValue(key: string, value: unknown): string | null {
  if (key === 'display') {
    if (value === false || value === 'none') return 'none'
    if (value === true) return 'flex'
    return String(value)
  }
  if (key === 'overflow') {
    if (value === 'hidden') return 'hidden'
    if (value === 'scroll' || value === 'auto') return 'auto'
    return 'visible'
  }
  if (typeof value === 'number') {
    if (UNITLESS_PROPERTIES.has(key)) return String(value)
    if (PIXEL_PROPERTIES.has(key)) return `${value}px`
    return String(value)
  }
  return String(value)
}

export function styleToCss(style: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined) continue
    const property = CSS_PROPERTIES[key]
    if (!property) continue
    const css = toCssValue(key, value)
    if (css !== null) parts.push(`${property}: ${css}`)
  }
  return parts.join('; ')
}
