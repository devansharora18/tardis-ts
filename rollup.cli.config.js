import typescript from '@rollup/plugin-typescript'

const external = [/^node:/, 'commander', 'chokidar', 'esbuild', 'typescript']

export default [
  {
    input: 'bin/tardis.ts',
    output: {
      file: 'dist/bin/tardis.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
    external,
  },
]
