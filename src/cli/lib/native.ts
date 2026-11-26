import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ENTRY_CANDIDATES = [
  'app.tsx',
  'src/app.tsx',
  'index.tsx',
  'src/index.tsx',
]

export function findEntry(cwd: string, explicit?: string): string {
  if (explicit) {
    const entry = path.resolve(cwd, explicit)
    if (!fs.existsSync(entry)) {
      throw new Error(`Entry not found: ${entry}`)
    }
    return entry
  }
  for (const candidate of ENTRY_CANDIDATES) {
    const entry = path.join(cwd, candidate)
    if (fs.existsSync(entry)) return entry
  }
  throw new Error(
    `No app entry found. Create app.tsx, or pass a path: tardis build src/main.tsx`
  )
}

export function findNativeBinary(cwd: string): string {
  if (process.env['TARDIS_NATIVE_BIN']) {
    return process.env['TARDIS_NATIVE_BIN']
  }
  const exe = process.platform === 'win32' ? '.exe' : ''
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(cwd, `native/target/release/tardis-native${exe}`),
    path.resolve(cwd, `native/target/debug/tardis-native${exe}`),
    path.resolve(here, `../../native/target/release/tardis-native${exe}`),
    path.resolve(here, `../../native/target/debug/tardis-native${exe}`),
    path.resolve(here, `../../../native/target/release/tardis-native${exe}`),
    path.resolve(here, `../../../native/target/debug/tardis-native${exe}`),
    path.resolve(cwd, `node_modules/.bin/tardis-native${exe}`),
    path.resolve(here, `../bin/tardis-native${exe}`),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  throw new Error(
    'Native runtime not found.\n' +
      '  Build it: cargo build --manifest-path native/Cargo.toml\n' +
      '  Or set TARDIS_NATIVE_BIN to the binary path.'
  )
}
