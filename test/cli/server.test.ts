import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { serveDirectory, type RunningServer } from '../../src/cli/lib/server'

const dirs: string[] = []
let server: RunningServer | null = null

afterEach(async () => {
  await server?.close()
  server = null
  await Promise.all(
    dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  )
})

async function fixture(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tardis-serve-'))
  dirs.push(dir)
  await fs.writeFile(
    path.join(dir, 'index.html'),
    '<!doctype html><html><body><div id="app"></div></body></html>',
    'utf8'
  )
  await fs.writeFile(path.join(dir, 'app.js'), 'console.log("app")', 'utf8')
  return dir
}

describe('static server', () => {
  it('serves files and the reload version endpoint', async () => {
    const dir = await fixture()
    server = await serveDirectory({ dir, port: 0, reload: true })
    const base = `http://127.0.0.1:${server.port}`

    const html = await fetch(`${base}/`).then((response) => response.text())
    expect(html).toContain('id="app"')
    expect(html).toContain('__tardis_ts_version')

    const first = await fetch(`${base}/__tardis_ts_version`).then((response) =>
      response.text()
    )
    expect(first).toBe('0')
    server.bump()
    const second = await fetch(`${base}/__tardis_ts_version`).then((response) =>
      response.text()
    )
    expect(second).toBe('1')

    const js = await fetch(`${base}/app.js`)
    expect(js.headers.get('content-type')).toContain('text/javascript')
    expect(await js.text()).toContain('console.log')
  })

  it('returns 404 for missing files', async () => {
    const dir = await fixture()
    server = await serveDirectory({ dir, port: 0 })
    const response = await fetch(`http://127.0.0.1:${server.port}/missing.js`)
    expect(response.status).toBe(404)
  })

  it('does not inject the reload script in preview mode', async () => {
    const dir = await fixture()
    server = await serveDirectory({ dir, port: 0, reload: false })
    const html = await fetch(`http://127.0.0.1:${server.port}/`).then((response) =>
      response.text()
    )
    expect(html).not.toContain('__tardis_ts_version')
  })
})
