import typescript from '@rollup/plugin-typescript'

const external = [/^node:/, 'commander', 'chokidar', 'esbuild', 'typescript']

export default [
  {
    input: 'bin/tardis-ts.ts',
    output: {
      file: 'dist/bin/tardis-ts.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
    external,
  },
]
