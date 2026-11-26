import path from 'node:path'
import { bundleApp } from '../../compiler/bundle'
import { findEntry } from '../lib/native'

export type BuildTarget = 'native' | 'web'

export interface BuildOptions {
  entry?: string
  out?: string
  minify?: boolean
  target?: BuildTarget
}

export interface BuildResult {
  target: BuildTarget
  entry: string
  outfile: string
  bytes: number
  shell?: string
}

export async function buildApp(
  cwd = process.cwd(),
  options: BuildOptions = {}
): Promise<BuildResult> {
  const target = options.target ?? 'native'
  const entry = findEntry(cwd, options.entry)
  const defaultOut = target === 'web' ? 'dist/web/app.js' : 'dist/app.js'
  const outfile = path.resolve(cwd, options.out ?? defaultOut)
  const bundle = await bundleApp({
    entry,
    outfile,
    minify: options.minify,
    target,
  })
  return {
    target,
    entry,
    outfile: bundle.outfile,
    bytes: bundle.bytes,
    shell: bundle.shell,
  }
}
