#!/usr/bin/env node
// Serve both benchmark apps and collect frame statistics in headless Chrome.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const REPEATS = Number(process.env.REPEATS ?? 3)

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim()
    for (const candidate of [
      path.join(root, 'playwright', 'index.mjs'),
      path.join(root, 'omniroute', 'node_modules', 'playwright', 'index.mjs'),
    ]) {
      if (fs.existsSync(candidate)) return import(candidate)
    }
    throw new Error('playwright not found; install it or set up npm root -g')
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
}

function serve(root, port) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const relative = url.pathname === '/' ? '/index.html' : url.pathname
    const file = path.resolve(root, `.${relative}`)
    if (!file.startsWith(path.resolve(root))) {
      response.writeHead(403).end()
      return
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404).end()
        return
      }
      response.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      })
      response.end(data)
    })
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function measure(browser, url, label) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
  try {
    await page.waitForFunction(() => window.__benchResult !== undefined, {
      timeout: 180_000,
    })
  } catch (error) {
    throw new Error(`${label}: benchmark did not finish (${errors.join('; ')})`)
  }
  const result = await page.evaluate(() => window.__benchResult)
  await page.close()
  if (errors.length > 0) {
    console.warn(`${label}: console errors: ${errors.join('; ')}`)
  }
  return result
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const serverTardis = await serve(path.join(here, 'tardis'), 4310)
const serverDioxus = await serve(path.join(here, 'dioxus'), 4311)
const { chromium } = await loadPlaywright()
const launchOptions = {
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
}
for (const candidate of [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]) {
  if (candidate && fs.existsSync(candidate)) {
    launchOptions.executablePath = candidate
    break
  }
}
const browser = await chromium.launch(launchOptions)

const results = { tardis: [], dioxus: [] }
try {
  for (let round = 0; round < REPEATS; round += 1) {
    const order =
      round % 2 === 0
        ? ['tardis', 'dioxus']
        : ['dioxus', 'tardis']
    for (const target of order) {
      const url =
        target === 'tardis'
          ? 'http://127.0.0.1:4310/'
          : 'http://127.0.0.1:4311/'
      results[target].push(await measure(browser, url, target))
      console.log(`${target} round ${round + 1}:`, results[target].at(-1))
    }
  }
} finally {
  await browser.close()
  serverTardis.close()
  serverDioxus.close()
}

const summary = {}
for (const [name, samples] of Object.entries(results)) {
  summary[name] = {
    mean: median(samples.map((sample) => sample.mean)),
    p50: median(samples.map((sample) => sample.p50)),
    p95: median(samples.map((sample) => sample.p95)),
    dropped: median(samples.map((sample) => sample.dropped)),
    fps: median(samples.map((sample) => sample.fps)),
  }
}
const output = { repeats: REPEATS, summary, samples: results }
fs.writeFileSync(
  path.join(here, 'results.json'),
  JSON.stringify(output, null, 2) + '\n'
)
console.log(JSON.stringify(summary, null, 2))
