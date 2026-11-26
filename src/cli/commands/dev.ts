import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import chokidar from 'chokidar'
import { buildApp, type BuildOptions } from './build'
import { findNativeBinary } from '../lib/native'

export interface DevOptions extends BuildOptions {
  width?: number
  height?: number
}

export async function devApp(
  cwd = process.cwd(),
  options: DevOptions = {}
): Promise<void> {
  const binary = findNativeBinary(cwd)
  let child: ChildProcess | null = null
  let stopping = false
  let building = false
  let again = false

  const start = async (): Promise<void> => {
    if (building || stopping) {
      again = true
      return
    }
    building = true
    try {
      const built = await buildApp(cwd, options)
      if (stopping) return
      child?.kill('SIGTERM')
      child = spawn(
        binary,
        [
          '--bundle',
          built.outfile,
          '--width',
          String(options.width ?? 800),
          '--height',
          String(options.height ?? 600),
        ],
        { stdio: 'inherit' }
      )
      child.once('exit', (code) => {
        if (!stopping) {
          console.log(`tardis: app exited (${code ?? 0}); watching for changes`)
        }
      })
      console.log(
        `tardis: built ${path.relative(cwd, built.outfile)} (${built.bytes} bytes)`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`tardis: build failed\n${message}`)
    } finally {
      building = false
      if (again && !stopping) {
        again = false
        void start()
      }
    }
  }

  await start()

  const watcher = chokidar.watch(['**/*.tsx', '**/*.ts'], {
    cwd,
    ignoreInitial: true,
    ignored: ['**/node_modules/**', '**/dist/**', '**/native/**'],
  })
  let timer: ReturnType<typeof setTimeout> | null = null
  watcher.on('all', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void start(), 120)
  })
  console.log('tardis: watching for changes (ctrl-c to stop)')

  await new Promise<void>((resolve) => {
    const stop = (): void => {
      if (stopping) return
      stopping = true
      if (timer) clearTimeout(timer)
      void watcher.close()
      child?.kill('SIGTERM')
      resolve()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}
