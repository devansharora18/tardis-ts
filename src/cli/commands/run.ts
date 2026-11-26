import { spawn } from 'node:child_process'
import { buildApp, type BuildOptions } from './build'
import { findNativeBinary } from '../lib/native'

export interface RunOptions extends BuildOptions {
  width?: number
  height?: number
  scale?: number
  backend?: string
}

export function nativeRunArgs(outfile: string, options: RunOptions): string[] {
  const args = [
    '--bundle',
    outfile,
    '--width',
    String(options.width ?? 800),
    '--height',
    String(options.height ?? 600),
  ]
  if (options.scale !== undefined) args.push('--scale', String(options.scale))
  if (options.backend) args.push('--backend', options.backend)
  return args
}

export async function runApp(
  cwd = process.cwd(),
  options: RunOptions = {}
): Promise<number> {
  const built = await buildApp(cwd, options)
  const binary = findNativeBinary(cwd)
  const args = nativeRunArgs(built.outfile, options)
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(binary, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 0))
  })
}
