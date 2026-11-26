import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { nativeBinaryCandidates } from '../../src/cli/lib/native'
import { nativeRunArgs } from '../../src/cli/commands/run'

describe('native binary resolution', () => {
  it('finds the platform package next to an installed scope', () => {
    const here = path.resolve('/app/node_modules/@devansharora18/tardisjs/dist/bin')
    const candidates = nativeBinaryCandidates('/app', here, 'linux', 'x64')
    expect(candidates[0]).toBe(
      path.resolve(
        '/app/node_modules/@devansharora18/tardisjs-linux-x64/bin/tardis-native'
      )
    )
    expect(candidates[1]).toBe(
      path.resolve(
        '/app/node_modules/@devansharora18/tardisjs-linux-x64/bin/tardis-native'
      )
    )
  })

  it('uses the exe suffix on windows', () => {
    const here = path.resolve('C:/app/node_modules/@devansharora18/tardisjs/dist/bin')
    const candidates = nativeBinaryCandidates('C:/app', here, 'win32', 'x64')
    expect(candidates[0].endsWith('tardis-native.exe')).toBe(true)
    expect(candidates[0]).toContain('tardisjs-win32-x64')
  })
})

describe('native run arguments', () => {
  it('forwards scale and backend', () => {
    expect(
      nativeRunArgs('/tmp/app.js', {
        width: 640,
        height: 480,
        scale: 2,
        backend: 'wgpu',
      })
    ).toEqual([
      '--bundle',
      '/tmp/app.js',
      '--width',
      '640',
      '--height',
      '480',
      '--scale',
      '2',
      '--backend',
      'wgpu',
    ])
  })
})
