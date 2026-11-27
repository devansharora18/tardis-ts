#!/usr/bin/env node
// Electron React frame benchmark over CDP.
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  ;({ chromium } = await import(path.join(g, 'omniroute/node_modules/playwright/index.mjs')))
}

const electron = path.resolve('bench/electron/node_modules/electron/dist/electron')
const child = spawn(electron, ['bench/electron', '--no-sandbox', '--remote-debugging-port=9333'], {
  env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ':47' },
  stdio: 'ignore',
})
await new Promise((resolve) => setTimeout(resolve, 2500))
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
const pages = browser.contexts().flatMap((context) => context.pages())
const page = pages[0]
if (!page) throw new Error('no Electron page')
await page.waitForFunction(() => window.__benchResult !== undefined, { timeout: 120_000 })
const result = await page.evaluate(() => window.__benchResult)
const rss = Number(
  execFileSync('bash', ['-lc', "ps -C electron -o rss= | awk '{s+=$1} END {print s+0}'"], {
    encoding: 'utf8',
  }).trim()
)
fs.writeFileSync(
  'bench/electron/results.json',
  JSON.stringify({ frame: result, rssKb: rss }, null, 2) + '\n'
)
console.log(JSON.stringify({ frame: result, rssKb: rss }, null, 2))
await browser.close()
child.kill('SIGTERM')
