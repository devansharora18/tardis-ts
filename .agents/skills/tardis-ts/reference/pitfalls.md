# Pitfalls

- **Text wrapping**: column text is stretched before measurement now. Row-based
  text (TextField code rows) must use `wrap={false}` to avoid row-height drift.
- **Pointer caret placement** is not implemented. Selection is keyboard-driven.
- **Dynamic arrays rebuild**. There is no keyed reuse; use VirtualList for scale.
- **Styles are objects**. `className` is web-only; native ignores it.
- **Inline style defaults beat CSS classes** on web. Web-only skins need
  `!important` overrides for layout/display/color.
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
