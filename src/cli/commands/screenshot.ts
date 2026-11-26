import { spawn } from 'node:child_process'
import path from 'node:path'
import { buildApp, type BuildOptions } from './build'
import { findNativeBinary } from '../lib/native'

export interface ScreenshotOptions extends BuildOptions {
  out?: string
  dump?: string
  width?: number
  height?: number
}

export interface ScreenshotResult {
  png: string
  dump?: string
}

export async function screenshotApp(
  cwd = process.cwd(),
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const built = await buildApp(cwd, options)
  const binary = findNativeBinary(cwd)
  const png = path.resolve(cwd, options.out ?? 'screenshot.png')
  const dump = options.dump ? path.resolve(cwd, options.dump) : undefined
  const args = [
    '--headless',
    '--bundle',
    built.outfile,
    '--width',
    String(options.width ?? 800),
    '--height',
    String(options.height ?? 600),
    '--out',
    png,
  ]
  if (dump) args.push('--dump', dump)

  const result = await capture(binary, args)
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `native runtime exited with ${result.code}`)
  }
  return { png, dump }
}

async function capture(
  binary: string,
  args: string[]
): Promise<{ code: number; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.once('error', reject)
    child.once('exit', (code) => resolve({ code: code ?? 0, stderr }))
  })
}
