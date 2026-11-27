# Components and props

All components are imported from `@devansharora18/tardis-ts/scene`.

## Intrinsics

`div`, `section`, `main`, `header`, `footer`, `nav`, `ul`, `li`, `span`, `label`,
`strong`, `em`, `p`, `h1`–`h6`, `button`, `img`.

- `div` defaults to a column flexbox; `nav` defaults to row.
- `button` is clickable and tabbable by default.
- Semantic tags become real HTML elements on web.
- `img` needs `src` and optional `fit: 'cover' | 'contain' | 'fill'`.
- Native PNG sources can be paths or `data:image/png;base64,...`.

Styles: `width height min/maxWidth/Height padding* margin* flexDirection
justifyContent alignItems gap flexGrow flexShrink flexWrap position top right
bottom left backgroundColor borderRadius borderWidth borderColor opacity overflow
display fontSize fontWeight fontFamily color lineHeight textAlign textOverflow
whiteSpace`.

## TextField

Controlled or uncontrolled. Single-line or `multiline`.

Key props: `value`, `onChange`, `placeholder`, `ariaLabel`, `width`, `disabled`,
`multiline`, `rows`, `fontFamily`, `tabInserts`, `autoIndent`, `wrap`,
`onCaretChange`, `highlightLine`, `lineStyle`, `onKeyDown`, `onSubmit`,
`onFocus`, `onBlur`.

`highlightLine(line, index)` returns `{ start, end, color?, backgroundColor?,
fontWeight? }[]`; used for syntax colors.

## Checkbox, Select, RadioGroup

- `Checkbox({ checked, onChange, label, ariaLabel })`.
- `Select({ value, options, onChange, placeholder, ariaLabel, width, disabled })`.
- `RadioGroup({ value, options, onChange, ariaLabel, direction })`.

Option: `{ value: string; label: string; disabled?: boolean }`.

## VirtualList

`VirtualList({ items, rowHeight, height, renderRow, overscan?, scrollTop?,
onScroll? })`. Use for 1k+ rows. It mounts visible rows plus overscan.

## ScrollView

`ScrollView({ height, contentHeight, scrollTop?, onScroll?, showScrollbar?,
children })`. Content height is explicit; the thumb is draggable.

## Dialog

`Dialog({ open, onClose, title?, width?, children })`. Traps Tab, restores focus,
closes on Escape. Panel stays mounted while closed.

## Boundary

`Boundary({ content, fallback?, onError?, onReset? })`. Catches render errors and
effect errors from effects created inside the content.

## Canvas-like work

There is no canvas node yet. Paint uses `<img src="data:image/png;base64,...">`
with a pure-TS PNG encoder. Reuse `examples/paint/png.ts` for bitmap apps.
