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
  // compiler subpath — tsx transform + bundler
  {
    input: 'src/compiler/index.ts',
    output: { file: 'dist/compiler/index.mjs', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
    external,
  },
]
