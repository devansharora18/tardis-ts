# 0003 — TSX-only v2 replaces the blueprint surface

Status: accepted    Date: 2026-11-26    Deciders: Devansh Arora
Supersedes: the "web backend stays" consequences of ADR 0001 and 0002

## Context

TardisJS v1 ships a custom `.tardis` blueprint DSL: a lexer, a parser, and a
compiler that emits DOM operations. The v2 directive is:

- the surface is TSX only; `.tardis` is removed,
- the framework targets native rendering first,
- existing users are not a constraint.

The blueprint syntax was the main source of tooling friction: a custom grammar,
a custom VSCode extension, docs pages that had to escape braces, and a compiler
that could not reuse the TypeScript ecosystem. TSX removes all of that and gives
users the editor, types, and ecosystem they already know.

## Options

1. **Keep both surfaces.** `.tardis` compiles to the web, TSX compiles to native.
   Two compilers, two docs sets, two mental models. The directive rejects it.
2. **Add TSX alongside, deprecate `.tardis` later.** Smaller one-time break, but
   keeps the dead surface and its tests in the repo for a full release cycle.
3. **Replace the surface and the renderer** (chosen). TSX compiles to a scene
   runtime; the blueprint pipeline, web runtime, SSR, demos, and docs site are
   removed. Signals and CLI utilities are reused.

## Decision

Option 3. TardisJS 2.0 is a TSX framework with a native renderer. The package
name stays `@devansharora18/tardisjs`; the version becomes `2.0.0-alpha.0`.
No compatibility layer, no `.tardis` loader, no deprecation period.

The native target is first. A web backend is deferred to M7 and will consume the
same scene ops through a DOM adapter rather than a second compiler.

## Consequences

- Every v1 app, demo, and docs page stops compiling. They are removed from the
  repository; git history preserves them.
- The npm package loses the `/runtime`, `/ssr`, and `/testing` subpaths. The new
  subpaths are `/scene` and `/compiler`.
- The VSCode extension loses its `.tardis` grammar. TSX support is built into
  editors, so the extension is removed rather than rewritten.
- Web output is gone until the scene-to-DOM adapter lands. "Cross-platform" in
  v2 means native desktop first, then other native targets.
- The initial renderer is CPU rasterization (tiny-skia) behind a renderer
  boundary. wgpu is a later swap, not a protocol change.

## Revisit

If a web target becomes a requirement before the native desktop slice is stable,
build a scene-to-DOM adapter that consumes the same patch ops. Do not resurrect
the blueprint compiler.
