# Frame protocol

Two channels connect the JS scene runtime and the Rust core. Both are
in-process; no sockets, no serialization across processes.

- **Patch** — JS → Rust, once per frame, atomic.
- **Events** — Rust → JS, drained at frame start.

The op set below is the contract. v0 encodes it as JSON for debuggability; v1
switches to the binary layout at the end of this document. The op set does not
change between versions.

## Scene model

The tree has one root with id `0`, created by the core. Node kinds:

| Kind | Purpose |
|---|---|
| `view` | Container. Flex/grid layout, background, border radius, clip. |
| `text` | Single styled text run. String content, native shaping. |
| `image` | Decoded image, sized by layout. |
| `scroll` | View with scroll offsets and scrollbars. |
| `canvas` | Reserved for custom GPU draw. |
| `input` | Reserved for editable text (later milestone). |

Ids are `u32`, monotonically increasing, never reused. Styles are typed
records; there is no CSS parser on either side.

## Patch ops (v0 JSON)

```json
{
  "v": 0,
  "frame": 42,
  "ops": [
    { "op": "create", "id": 1, "kind": "view", "parent": 0, "index": 0 },
    { "op": "style", "id": 1, "props": { "flexDirection": "row", "gap": 8, "padding": 16 } },
    { "op": "create", "id": 2, "kind": "text", "parent": 1, "index": 0 },
    { "op": "text", "id": 2, "value": "Hello" },
    { "op": "style", "id": 2, "props": { "fontSize": 18, "color": "#ededed" } },
    { "op": "destroy", "id": 99 }
  ]
}
```

| Op | Fields | Meaning |
|---|---|---|
| `create` | `id, kind, parent, index` | Insert a new node. |
| `destroy` | `id` | Remove node and subtree. |
| `style` | `id, props` | Merge style properties. Unset keys are unchanged. |
| `text` | `id, value` | Replace a text node's string. |
| `image` | `id, src, fit` | Set image source and fit mode. |
| `insert` | `id, parent, index` | Reparent or reorder an existing node. |
| `scroll` | `id, x, y` | Set scroll offsets. |
| `clip` | `id, radius` | Set clip radius for a scroll/view. |

Style properties (v0):

```
width height minWidth maxWidth minHeight maxHeight
padding paddingTop paddingRight paddingBottom paddingLeft
margin marginTop marginRight marginBottom marginLeft
flexDirection justifyContent alignItems alignSelf gap
flexGrow flexShrink flexWrap
position top right bottom left
backgroundColor borderRadius
opacity overflow
fontSize fontWeight fontFamily color lineHeight textAlign
```

Values are numbers, booleans, or strings from a closed set. `backgroundColor`
and `color` accept `#rrggbb` or `#rrggbbaa`; parsing happens once, at patch
decode.

## Events (Rust → JS)

```json
{ "type": "pointer", "phase": "down", "x": 12.5, "y": 40, "button": 0 }
{ "type": "pointer", "phase": "move", "x": 13.0, "y": 41.0 }
{ "type": "wheel", "dx": 0, "dy": -120 }
{ "type": "key", "phase": "down", "code": "KeyA", "repeat": false,
  "mods": { "ctrl": false, "shift": false, "alt": false, "meta": false } }
{ "type": "text", "value": "a" }
{ "type": "resize", "width": 1200, "height": 800, "scale": 1.5 }
{ "type": "scroll", "id": 3, "x": 0, "y": 120 }
{ "type": "focus", "id": 5, "focused": true }
{ "type": "frame", "id": 42, "cpu": 1.8, "gpu": 2.1 }
{ "type": "close" }
```

Hit testing is native: pointer events carry coordinates, and `scroll`/`focus`
carry node ids. JS never receives raw platform events.

## Invariants

1. `create` precedes every op on an id; `destroy` ends it.
2. A node has exactly one parent. Reparenting uses `insert`.
3. The root (`0`) is never destroyed or reparented.
4. A patch applies atomically at the frame boundary. On decode error the core
   rejects the whole frame, keeps the last good tree, and reports the error —
   it never crashes the window.
5. Node ids are never reused, so stale references fail instead of hitting a
   different node.
6. JS keeps at most one patch in flight. `frame` events carry the applied frame
   id and are the backpressure signal.
7. Unknown style keys are ignored with a warning in dev, silently in release.

## v1 binary layout

```
header:  magic "BSLT" | u16 version | u32 frame | u32 opCount
op:      u8 code | u32 id | payload
string:  u32 byteLength | utf8 bytes
style:   u16 propId | u8 type (f32 | u32 color | bool) | value
```

Op codes: `1 create, 2 destroy, 3 style, 4 text, 5 image, 6 insert, 7 scroll,
8 clip`. Property ids are assigned in the table above, top to bottom, starting
at 1; the table is append-only for compatibility.

## Versioning

The core reports `PROTOCOL_VERSION` at startup. A mismatched major version is a
hard error with both numbers in the message. Additive ops and style properties
do not bump the major version; renames and removals do.
