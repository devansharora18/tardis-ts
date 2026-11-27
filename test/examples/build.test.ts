import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bundleApp } from '../../src/compiler/bundle'

const root = path.resolve(__dirname, '../..')
const entries = fs
  .readdirSync(path.join(root, 'examples'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, 'examples', entry.name, 'app.tsx'))
  .filter((file) => fs.existsSync(file))

describe('example apps', () => {
  it('finds at least 15 examples', () => {
    expect(entries.length).toBeGreaterThanOrEqual(15)
  })

  it.each(entries.map((file) => [path.basename(path.dirname(file)), file]))(
    'bundles %s for web',
    async (_name, file) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-example-'))
      try {
        const result = await bundleApp({
          entry: file as string,
          outfile: path.join(dir, 'app.js'),
          target: 'web',
        })
        expect(result.bytes).toBeGreaterThan(1000)
        expect(fs.existsSync(result.shell!)).toBe(true)
      } finally {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
    120_000
  )
})
