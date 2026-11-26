// App bundler for both targets.
//
// Native: IIFE for QuickJS, `platform: neutral`.
// Web: IIFE for the browser plus a generated index.html shell.
//
// The same TSX entry is used. The web host is imported by the app for its side
// effect; in QuickJS `typeof document === 'undefined'`, so it is a no-op.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin } from 'esbuild'
import { compileTsx } from './tsx'

export type BundleTarget = 'native' | 'web'

export interface BundleOptions {
  entry: string
  outfile: string
  minify?: boolean
  sourcemap?: boolean
  target?: BundleTarget
  runtime?: string
  webRuntime?: string
  title?: string
  css?: string
}

export interface BundleResult {
  outfile: string
  bytes: number
  shell?: string
}

export function resolveRuntimeEntry(): string {
  if (process.env['TARDIS_TS_SCENE_ENTRY']) {
    return process.env['TARDIS_TS_SCENE_ENTRY']
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
    'tardis-ts: scene runtime not found. Build the package or set TARDIS_TS_SCENE_ENTRY.'
  )
}

export function resolveWebEntry(): string {
  if (process.env['TARDIS_TS_WEB_ENTRY']) {
    return process.env['TARDIS_TS_WEB_ENTRY']
  }
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '../web/index.ts'),
    path.resolve(here, '../../src/web/index.ts'),
    path.resolve(here, '../web/index.mjs'),
    path.resolve(here, '../../dist/web/index.mjs'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  throw new Error(
    'tardis-ts: web host not found. Build the package or set TARDIS_TS_WEB_ENTRY.'
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
    throw new Error(`tardis-ts: entry not found: ${entry}`)
  }
  const outfile = path.resolve(options.outfile)
  fs.mkdirSync(path.dirname(outfile), { recursive: true })
  const target = options.target ?? 'native'
  const sceneRuntime = options.runtime ?? resolveRuntimeEntry()
  const webRuntime = options.webRuntime ?? resolveWebEntry()

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'iife',
    platform: target === 'web' ? 'browser' : 'neutral',
    target: 'es2020',
    minify: options.minify ?? false,
    sourcemap: options.sourcemap ?? false,
    alias: {
      'tardis-ts/scene': sceneRuntime,
      '@devansharora18/tardis-ts/scene': sceneRuntime,
      'tardis-ts/web': webRuntime,
      '@devansharora18/tardis-ts/web': webRuntime,
    },
    plugins: [tsxPlugin()],
    logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })

  const result: BundleResult = {
    outfile,
    bytes: fs.statSync(outfile).size,
  }
  if (target === 'web') {
    result.shell = await writeShell(outfile, options.title, options.css)
  }
  return result
}

async function writeShell(
  outfile: string,
  title = 'Tardis TS app',
  css?: string
): Promise<string> {
  const dir = path.dirname(outfile)
  const shell = path.join(dir, 'index.html')
  const script = path.basename(outfile)
  const safeTitle = title.replace(/[<>&"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      default:
        return '&quot;'
    }
  })
  const cssLink = css
    ? `<link rel="stylesheet" href="./${path.relative(dir, path.resolve(css)).split(path.sep).join('/')}" />\n`
    : ''
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>${safeTitle}</title>
${cssLink}
<style>
  html, body, #app { height: 100%; margin: 0; }
  body {
    background: #0a0a0a;
    color: #ededed;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
</style>
</head>
<body>
<div id="app"></div>
<script src="./${script}"></script>
</body>
</html>
`
  await fs.promises.writeFile(shell, html, 'utf8')
  return shell
}
