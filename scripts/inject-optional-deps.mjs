#!/usr/bin/env node
// Add the platform packages to the published manifest. CI only.
import fs from 'node:fs'

const version = process.argv[2]
if (!version) {
  console.error('usage: inject-optional-deps.mjs <version>')
  process.exit(1)
}
const platforms = [
  ['linux', 'x64'],
  ['linux', 'arm64'],
  ['darwin', 'x64'],
  ['darwin', 'arm64'],
  ['win32', 'x64'],
]
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = version
pkg.optionalDependencies = Object.fromEntries(
  platforms.map(([platform, arch]) => [
    `@devansharora18/tardisjs-${platform}-${arch}`,
    version,
  ])
)
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log(`optional dependencies -> ${version}`)
