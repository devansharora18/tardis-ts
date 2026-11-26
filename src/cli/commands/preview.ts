import fs from 'node:fs/promises'
import path from 'node:path'
import { serveDirectory, type RunningServer } from '../lib/server'

export interface PreviewOptions {
  dir?: string
  port?: number
}

export async function previewProject(
  cwd = process.cwd(),
  options: PreviewOptions = {}
): Promise<RunningServer> {
  const dir = path.resolve(cwd, options.dir ?? 'dist/web')
  try {
    await fs.access(path.join(dir, 'index.html'))
  } catch {
    throw new Error(
      `No web build at ${dir}. Run "tardis build --target web" first.`
    )
  }
  const server = await serveDirectory({ dir, port: options.port ?? 4173 })
  console.log(
    `tardis: serving ${path.relative(cwd, dir) || dir} at ${server.url}`
  )
  return server
}
