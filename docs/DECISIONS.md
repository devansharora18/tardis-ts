# Decisions — v2 rewrite

Assumptions made during the TSX-native rewrite, newest first.

| # | Decision | Reason |
|---|---|---|
| 1 | Package name stays `@devansharora18/tardisjs`; version `2.0.0-alpha.0` | The npm identity is the asset; the surface changes, not the name |
| 2 | `.tardis` and every v1 artifact are removed, not deprecated | Explicit directive; a dual surface doubles the compiler and docs |
| 3 | Native desktop is the only target in v2 | Web needs a DOM adapter; native proves the architecture first |
| 4 | TSX compiles to a retained scene tree, not a VDOM | One DOM-equivalent operation per change, no diff of a virtual tree |
| 5 | Props in JSX are compiled to getters | Fine-grained updates without re-running components |
| 6 | Event props (`on[A-Z]`), `key`, `ref`, and function-valued props stay unwrapped | Wrapping callbacks would turn them into getters of functions |
| 7 | The compiler is a TypeScript transformer invoked by an esbuild plugin | Reuses the TypeScript parser; no second grammar |
| 8 | Intrinsic tags map to a closed set (`div`, `span`, `p`, `h1`–`h6`, `button`, `img`) | Keeps JSX readable without a CSS engine |
| 9 | Layout is flexbox via taffy; there is no CSS parser | Styles are typed objects, matching native constraints |
| 10 | v0 renders with tiny-skia on the CPU, behind a renderer boundary | Works headless and on any machine; wgpu swaps in later |
| 11 | Patch protocol v0 is JSON; the op set is final | Debuggable during bring-up; binary encoding is a transport change |
| 12 | Text uses bundled Liberation Sans | Deterministic rendering across machines; OFL licensed |
| 13 | Keyed list reuse is deferred; dynamic arrays re-create nodes | Correctness first; the reconciliation pass is the next milestone |
| 14 | The docs site, 19 demos, and VSCode grammar are removed | They only compile with the v1 blueprint pipeline |
| 15 | Headless viewport defaults to 800×600, background `#0a0a0a` | Matches the golden-image tests |
| 16 | Rust crates live under `native/` in this repo | Compiler and renderer must version together |
