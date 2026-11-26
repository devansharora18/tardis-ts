# 0002 — Native target ships inside the Tardis TS repository

Status: accepted    Date: 2026-11-26    Deciders: Devansh Arora
Amends: ADR 0001 (repository location only)

## Context

ADR 0001 chose the native architecture: an embedded JS engine plus a small Rust
renderer. It assumed a new repository because the native core needs Cargo and a
different release pipeline.

Tardis TS already owns the parser, the blueprint syntax, expression rewriting,
signals, the test suite, the CLI, the npm package, the docs site, and 19
examples. The native target needs all of that on day one. A second repository
would vendor the compiler immediately, then drift from it.

The npm package is also an asset: `tardis-ts` is published and installable.
Moving the work to a new name would break installs and churn every import,
demo, test, and doc before a single native frame renders.

## Options

1. **New repository** (the discarded `basalt` scaffold). Clean build
   separation, but the compiler is duplicated on day one, CI and releases
   split, and two brands compete for the same work.
2. **Same repository, rename the package first.** One brand, but it breaks
   existing installs and makes every diff during the native work a rename diff.
   No technical gain.
3. **Same repository, additive native target** (chosen). The `tardis-ts`
   package and web backend stay. A `native/` Cargo workspace and a native
   codegen backend are added. The npm package continues to ship the compiler
   and web runtime; native binaries ship later as optional platform packages.

## Decision

Option 3.

The repository gains:

```
native/
  Cargo.toml          workspace
  crates/core/        window, layout, text, gpu, input, a11y
  crates/js/          QuickJS host and bridge
  crates/cli/         native dev/build binary
src/scene/            TS scene runtime (signals, tree, widgets)
src/compiler/native/  scene codegen (shares parser and AST)
docs/native/          architecture and protocol
```

The web compiler and runtime are not rewritten. The native compiler is a
sibling backend that consumes the same AST and shares the expression, props,
slot, and control-flow logic. Extraction into a common IR happens only if the
two backends demonstrably drift, not before.

A rebrand, if wanted, is a mechanical rename performed as its own commit at M4,
after the native vertical slice works. It is not a prerequisite and not part of
the native work.

## Consequences

- CI runs a Rust job alongside the JS job. Linux first; macOS and Windows at M6.
- npm packaging must exclude `native/`, `target/`, and Rust build artifacts.
- The repo carries two toolchains. A contributor can work on the compiler
  without Rust; native work requires Cargo.
- The main package stays installable and the 756 existing tests keep protecting
  the shared layers.
- ADR 0001's architecture stands. Its new-repository consequence is void.
- The `basalt` working name is dropped. The umbrella stays Tardis TS; the native
  binary is `tardis-ts-native` until a rename says otherwise.

## Revisit

Split the native core into its own repository only if crate release cadence
becomes incompatible with npm releases or if CI time on the combined repo
exceeds a tolerable threshold. Neither is true at M0.
