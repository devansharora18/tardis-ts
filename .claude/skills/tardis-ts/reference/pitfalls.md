# Pitfalls

- **Text wrapping**: column text is stretched before measurement now. Row-based
  text (TextField code rows) must use `wrap={false}` to avoid row-height drift.
- **Pointer caret placement** is not implemented. Selection is keyboard-driven.
- **Dynamic arrays rebuild**. There is no keyed reuse; use VirtualList for scale.
- **Styles are objects**. `className` is web-only; native ignores it.
- **Inline style defaults beat CSS classes** on web. Web-only skins need
  `!important` overrides for layout/display/color.
- **Web borders need a style.** The base sets `border-style: solid`,
  `border-color: transparent`, `border-width: 0`. Setting `borderWidth` is enough;
  do not add a global `border-style` without the zero width.
- **Pointer down resolves the handler before moving focus.** Controls that live
  in a focus-triggered rebuild still receive the press. Keep interactive forms
  out of dynamic wrappers when possible.
- **TextField's initial value read is untracked.** An outer `dynamic` around a
  field will not rebuild on every keystroke. Do not read the same value directly
  in the outer factory or focus will be lost after one character.
- **Images need `draggable: false`** if they sit under a pointer canvas; the
  browser's native image drag cancels the pointer stream.
- **Use getters for TextField theme colors** when they depend on signals:
  `borderColor: () => error() ? danger : border`. A plain value is captured at
  mount.
- **`data-tardis-ts`** is the DOM attribute (not `data-tardis`).
- **Host globals** use `__tardis_ts_*`.
- **Text nodes are elements on web** (`span`), so full-list updates have more
  DOM nodes than a raw text-node renderer. The 10k browser benchmark reflects this.
- **Native fetch is synchronous inside the host**, then resolved as a Promise;
  the host drains the QuickJS job queue after dispatch.
- **PDF and browser audio APIs are web-only**. Guard `document` and show a clear
  desktop message.
- **Hydration is structural adoption**, not streaming SSR or node-by-node
  reconciliation.
- **wgpu is presentation first**; rasterization is CPU until the geometry
  pipeline lands.
