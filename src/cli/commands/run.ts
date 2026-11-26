import { spawn } from 'node:child_process'
import { buildApp, type BuildOptions } from './build'
import { findNativeBinary } from '../lib/native'

export interface RunOptions extends BuildOptions {
  width?: number
  height?: number
}

export async function runApp(
  cwd = process.cwd(),
  options: RunOptions = {}
): Promise<number> {
  const built = await buildApp(cwd, options)
  const binary = findNativeBinary(cwd)
  const args = [
    '--bundle',
    built.outfile,
    '--width',
    String(options.width ?? 800),
    '--height',
    String(options.height ?? 600),
  ]
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(binary, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 0))
  })
}
