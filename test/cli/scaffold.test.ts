import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createProject } from '../../src/cli/commands/init'

const dirs: string[] = []

function temp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tardis-scaffold-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('scaffolder', () => {
  it('writes a web + tailwind + sheet project', async () => {
    const dir = temp()
    const result = await createProject(path.join(dir, 'sheet-app'), {
      platform: 'web',
      styling: 'tailwind',
      template: 'sheet',
      install: false,
      git: false,
      prompt: false,
    })
    expect(result.files).toContain('app.tsx')
    expect(result.files).toContain('tailwind.config.js')
    expect(result.files).toContain('src/styles.css')
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, 'sheet-app', 'package.json'), 'utf8')
    )
    expect(pkg.scripts['dev']).toContain('tardis-ts dev --target web')
    expect(pkg.scripts['build:web']).toContain('--css')
    expect(pkg.devDependencies.tailwindcss).toBeTruthy()
    expect(pkg.scripts['screenshot']).toBeUndefined()

    const app = fs.readFileSync(path.join(dir, 'sheet-app', 'app.tsx'), 'utf8')
    expect(app).toContain('VirtualList')
    expect(app).toContain('100_000')
    expect(app).toContain('className')
  })

  it('writes a native-only project without web scripts', async () => {
    const dir = temp()
    await createProject(path.join(dir, 'native-app'), {
      platform: 'native',
      styling: 'tailwind',
      template: 'counter',
      install: false,
      git: false,
      prompt: false,
    })
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, 'native-app', 'package.json'), 'utf8')
    )
    expect(pkg.scripts['dev']).toBe('tardis-ts dev')
    expect(pkg.scripts['screenshot']).toBe('tardis-ts screenshot')
    expect(pkg.scripts['dev:web']).toBeUndefined()
    expect(pkg.devDependencies).toBeUndefined()
    expect(resultTailwindFile(dir)).toBe(false)
  })

  it('refuses a non-empty directory unless forced', async () => {
    const dir = temp()
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'x')
    await expect(
      createProject(dir, { install: false, git: false, prompt: false })
    ).rejects.toThrow(/not empty/)
    const result = await createProject(dir, {
      install: false,
      git: false,
      prompt: false,
      force: true,
    })
    expect(result.files).toContain('app.tsx')
    expect(fs.existsSync(path.join(dir, 'keep.txt'))).toBe(true)
  })
})

function resultTailwindFile(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'native-app', 'tailwind.config.js'))
}
