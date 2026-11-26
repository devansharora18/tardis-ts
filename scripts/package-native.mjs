#!/usr/bin/env node
// Assemble one npm platform package around a built native binary.
import { parseArgs } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'

const { values } = parseArgs({
  options: {
    platform: { type: 'string' },
    arch: { type: 'string' },
    binary: { type: 'string' },
    version: { type: 'string' },
    out: { type: 'string', default: 'platform-dist' },
  },
})

for (const key of ['platform', 'arch', 'binary', 'version']) {
  if (!values[key]) {
    console.error(`missing --${key}`)
    process.exit(1)
  }
}
if (!fs.existsSync(values.binary)) {
  console.error(`binary not found: ${values.binary}`)
  process.exit(1)
}

const folder = `tardis-ts-${values.platform}-${values.arch}`
const root = path.resolve(values.out, folder)
const bin = path.join(root, 'bin')
fs.rmSync(root, { recursive: true, force: true })
fs.mkdirSync(bin, { recursive: true })

const name = values.platform === 'win32' ? 'tardis-ts-native.exe' : 'tardis-ts-native'
const target = path.join(bin, name)
fs.copyFileSync(values.binary, target)
if (values.platform !== 'win32') fs.chmodSync(target, 0o755)

fs.writeFileSync(
  path.join(root, 'package.json'),
  JSON.stringify(
    {
      name: `@devansharora18/${folder}`,
      version: values.version,
      description: `Tardis TS native runtime for ${values.platform}-${values.arch}`,
      license: 'MIT',
      os: [values.platform],
      cpu: [values.arch],
      files: ['bin'],
    },
    null,
    2
  ) + '\n'
)
console.log(path.join(root, 'package.json'))
