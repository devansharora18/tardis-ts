import typescript from '@rollup/plugin-typescript'

const external = ['typescript', 'esbuild', /^node:/]

export default [
  // runtime barrel
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // scene subpath — what compiled apps import
  {
    input: 'src/scene/index.ts',
    output: { file: 'dist/scene/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // web host subpath — DOM patch adapter
  {
    input: 'src/web/index.ts',
    output: { file: 'dist/web/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // server rendering + hydration
  {
    input: 'src/ssr/index.ts',
    output: { file: 'dist/ssr/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // devtools overlay — DOM-only patch/scene inspector
  {
    input: 'src/devtools/index.ts',
    output: { file: 'dist/devtools/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // compiler subpath — tsx transform + bundler
  {
    input: 'src/compiler/index.ts',
    output: { file: 'dist/compiler/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
    external,
  },
]
