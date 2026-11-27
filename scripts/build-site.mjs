#!/usr/bin/env node
// Build the landing page and docs site into site/dist.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')
const dist = path.join(root, 'site/dist')
fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(path.join(dist, 'docs'), { recursive: true })

execFileSync(process.execPath, ['scripts/build-docs-content.mjs'], { stdio: 'inherit' })

fs.copyFileSync(path.join(root, 'site/landing/landing.css'), path.join(dist, 'landing.css'))
fs.copyFileSync(path.join(root, 'site/docs/site.css'), path.join(dist, 'docs/site.css'))

const cli = path.join(root, 'dist/bin/tardis-ts.js')
if (!fs.existsSync(cli)) {
  console.error('build the package first: npm run build')
  process.exit(1)
}

for (const [entry, out, css] of [
  ['site/landing/app.tsx', 'site/dist/app.js', 'site/dist/landing.css'],
  ['site/docs/app.tsx', 'site/dist/docs/app.js', 'site/dist/docs/site.css'],
]) {
  execFileSync(process.execPath, [cli, 'build', entry, '--target', 'web', '--out', out, '--css', css], {
    stdio: 'inherit',
  })
}
console.log('site: site/dist')
