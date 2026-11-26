// Semantic element set shared by the DOM host and the server renderer.

export const TAG_ELEMENTS = new Set([
  'div',
  'section',
  'main',
  'header',
  'footer',
  'nav',
  'ul',
  'li',
  'span',
  'label',
  'strong',
  'em',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'button',
])

export function semanticTag(kind: string, tag: string): string {
  if (kind === 'image') return 'img'
  if (kind === 'fragment') return 'div'
  return TAG_ELEMENTS.has(tag) ? tag : 'div'
}
