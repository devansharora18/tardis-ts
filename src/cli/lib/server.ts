// Static file server for web preview and the web dev loop.
//
// The dev loop injects a tiny polling script into HTML responses: after each
// successful rebuild the version counter changes and the page reloads.

import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

export interface ServeOptions {
  dir: string
  port?: number
  reload?: boolean
}

export interface RunningServer {
  port: number
  url: string
  bump(): void
  close(): Promise<void>
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const RELOAD_SCRIPT = `<script>(()=>{let v=null;setInterval(async()=>{try{const r=await fetch('/__tardis_ts_version',{cache:'no-store'});const n=await r.text();if(v!==null&&n!==v)location.reload();v=n}catch{}},700)})()</script>`

export async function serveDirectory(
  options: ServeOptions
): Promise<RunningServer> {
  const root = path.resolve(options.dir)
  let version = 0

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname === '/__tardis_ts_version') {
        res.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end(String(version))
        return
      }
      const relative =
        url.pathname === '/'
          ? 'index.html'
          : decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const file = path.resolve(root, relative)
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403, { 'content-type': 'text/plain' })
        res.end('Forbidden')
        return
      }
      let body = await fs.readFile(file)
      if (options.reload && file.endsWith('index.html')) {
        body = Buffer.from(
          body
            .toString('utf8')
            .replace(/<\/body>/i, `${RELOAD_SCRIPT}</body>`)
        )
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      res.end(body)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('Not found')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 4173, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  const port =
    typeof address === 'object' && address ? address.port : (options.port ?? 4173)

  return {
    port,
    url: `http://localhost:${port}`,
    bump(): void {
      version++
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
