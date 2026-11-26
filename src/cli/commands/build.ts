import path from 'node:path'
import { bundleApp } from '../../compiler/bundle'
import { findEntry } from '../lib/native'

export interface BuildOptions {
  entry?: string
  out?: string
  minify?: boolean
}

export interface BuildResult {
  entry: string
  outfile: string
  bytes: number
}

export async function buildApp(
  cwd = process.cwd(),
  options: BuildOptions = {}
): Promise<BuildResult> {
  const entry = findEntry(cwd, options.entry)
  const outfile = path.resolve(cwd, options.out ?? 'dist/app.js')
  const bundle = await bundleApp({
    entry,
    outfile,
    minify: options.minify,
  })
  return { entry, outfile: bundle.outfile, bytes: bundle.bytes }
}
