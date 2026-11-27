import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
  type SceneNode,
} from '@devansharora18/tardis-ts/scene'
import { sections, type DocSection } from './content.generated'
import { Markdown, outline } from './markdown'

const initial = (() => {
  if (typeof location === 'undefined') return sections[0]!.slug
  const hash = location.hash.replace('#', '')
  return sections.some((section) => section.slug === hash) ? hash : sections[0]!.slug
})()

const [selected, setSelected] = createSignal(initial)
const [query, setQuery] = createSignal('')

const current = (): DocSection =>
  sections.find((section) => section.slug === selected()) ?? sections[0]!

const choose = (slug: string): void => {
  setSelected(slug)
  setQuery('')
  if (typeof location !== 'undefined') {
    history.replaceState(null, '', `#${slug}`)
  }
  if (typeof document !== 'undefined') {
    const main = document.querySelector('.docs-main')
    if (main) main.scrollTop = 0
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const slug = location.hash.replace('#', '')
    if (sections.some((section) => section.slug === slug)) setSelected(slug)
  })
}

function Link(props: {
  label: string
  href: string
  className?: string
}): SceneNode {
  return jsx(
    'span',
    {
      role: 'link',
      tabIndex: 0,
      className: props.className ?? 'doc-link',
      onClick: () => {
        if (typeof window !== 'undefined') window.location.href = props.href
      },
    },
    props.label
  )
}

function App(): ReturnType<typeof jsx> {
  const filtered = (): DocSection[] => {
    const text = query().trim().toLowerCase()
    if (text === '') return sections
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(text) ||
        section.body.toLowerCase().includes(text)
    )
  }
  const groups = (): string[] => [...new Set(filtered().map((section) => section.group))]
  const index = (): number =>
    sections.findIndex((section) => section.slug === selected())
  const previous = (): DocSection | undefined => sections[index() - 1]
  const next = (): DocSection | undefined => sections[index() + 1]

  return jsx(
    'div',
    { className: 'docs-shell' },
    jsx(
      'header',
      { className: 'docs-top' },
      jsx(
        'div',
        { className: 'brand' },
        jsx('span', { className: 'brand-mark' }, 'tardis-ts'),
        jsx('span', { className: 'brand-version' }, '2.0 alpha')
      ),
      jsx(
        'nav',
        { className: 'top-nav' },
        jsx(Link, { label: 'Home', href: '../index.html', className: 'top-link' }),
        jsx(Link, { label: 'Examples', href: '../index.html#examples', className: 'top-link' }),
        jsx(Link, { label: 'GitHub', href: 'https://github.com/devansharora18/tardis-ts', className: 'top-link' })
      ),
      jsx(
        'div',
        { className: 'top-search' },
        jsx(TextField, {
          value: () => query(),
          onChange: setQuery,
          ariaLabel: 'Search documentation',
          width: 260,
          placeholder: 'Search documentation',
        })
      )
    ),
    jsx(
      'div',
      { className: 'docs-layout' },
      jsx(
        'div',
        { className: 'docs-side' },
        dynamic(() => {
          if (filtered().length === 0) {
            return jsx('span', { className: 'side-empty' }, 'No matches')
          }
          return groups().map((group) =>
            jsx(
              'div',
              { key: group, className: 'side-group' },
              jsx('span', { className: 'side-title' }, group),
              ...filtered()
                .filter((section) => section.group === group)
                .map((section) =>
                  jsx(
                    'span',
                    {
                      key: section.slug,
                      role: 'link',
                      tabIndex: 0,
                      className:
                        section.slug === selected()
                          ? 'side-link side-link-active'
                          : 'side-link',
                      onClick: () => choose(section.slug),
                    },
                    section.title
                  )
                )
            )
          )
        })
      ),
      jsx(
        'main',
        { className: 'docs-main' },
        jsx(
          'div',
          { className: 'docs-crumb' },
          `${current().group}  /  ${current().title}`
        ),
        jsx('h1', { className: 'docs-title' }, current().title),
        jsx(Markdown, { source: current().body }),
        jsx(
          'div',
          { className: 'docs-pager' },
          previous()
            ? jsx(
                'div',
                { className: 'pager-card', onClick: () => choose(previous()!.slug) },
                jsx('span', { className: 'pager-label' }, 'Previous'),
                jsx('span', { className: 'pager-title' }, previous()!.title)
              )
            : jsx('div', {}),
          next()
            ? jsx(
                'div',
                { className: 'pager-card pager-next', onClick: () => choose(next()!.slug) },
                jsx('span', { className: 'pager-label' }, 'Next'),
                jsx('span', { className: 'pager-title' }, next()!.title)
              )
            : jsx('div', {})
        ),
        jsx(
          'div',
          { className: 'docs-edit' },
          jsx(Link, {
            label: 'Edit this page on GitHub',
            href: `https://github.com/devansharora18/tardis-ts/blob/main/${
              current().file.startsWith('README') ? 'README.md' : `docs/${current().file}`
            }`,
            className: 'doc-link',
          })
        )
      ),
      jsx(
        'div',
        { className: 'docs-toc' },
        jsx('span', { className: 'side-title' }, 'On this page'),
        ...outline(current().body).map((item) =>
          jsx(
            'span',
            {
              key: item.id,
              role: 'link',
              tabIndex: 0,
              className: 'toc-link',
              onClick: () => {
                if (typeof document !== 'undefined') {
                  const main = document.querySelector('.docs-main')
                  const target = main?.querySelector(`.${item.id}`)
                  target?.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }
              },
            },
            item.text
          )
        )
      )
    )
  )
}

render(() => jsx(App))
