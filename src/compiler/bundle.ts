// Native app bundler.
//
// esbuild handles module resolution and bundling; a load plugin routes `.tsx`
// through the scene compiler. The runtime is aliased to the in-repo source (or
// the built bundle in a published package) so apps import the scoped scene path
// without a second package.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin } from 'esbuild'
import { compileTsx } from './tsx'

export interface BundleOptions {
  entry: string
  outfile: string
  minify?: boolean
  sourcemap?: boolean
  runtime?: string
}

export interface BundleResult {
  outfile: string
  bytes: number
}

export function resolveRuntimeEntry(): string {
  if (process.env['TARDIS_SCENE_ENTRY']) {
    return process.env['TARDIS_SCENE_ENTRY']
  }
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '../scene/index.ts'),
    path.resolve(here, '../../src/scene/index.ts'),
    path.resolve(here, '../scene/index.mjs'),
    path.resolve(here, '../../dist/scene/index.mjs'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  throw new Error(
    'tardis: scene runtime not found. Build the package or set TARDIS_SCENE_ENTRY.'
  )
}

export function tsxPlugin(): Plugin {
  return {
    name: 'tardis-tsx',
    setup(pluginBuild) {
      pluginBuild.onLoad({ filter: /\.tsx$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8')
        const result = compileTsx(source, args.path)
        if (result.diagnostics.length > 0) {
          return {
            errors: result.diagnostics.map((text) => ({
              text,
              location: { file: args.path },
            })),
          }
        }
        return {
          contents: result.code,
          loader: 'js',
          resolveDir: path.dirname(args.path),
        }
      })
    },
  }
}

export async function bundleApp(options: BundleOptions): Promise<BundleResult> {
  const entry = path.resolve(options.entry)
  if (!fs.existsSync(entry)) {
    throw new Error(`tardis: entry not found: ${entry}`)
  }
  const outfile = path.resolve(options.outfile)
  fs.mkdirSync(path.dirname(outfile), { recursive: true })

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    minify: options.minify ?? false,
    sourcemap: options.sourcemap ?? false,
    alias: {
      'tardisjs/scene': options.runtime ?? resolveRuntimeEntry(),
      '@devansharora18/tardisjs/scene': options.runtime ?? resolveRuntimeEntry(),
    },
    plugins: [tsxPlugin()],
    logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })

  return { outfile, bytes: fs.statSync(outfile).size }
}
