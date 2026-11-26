import { describe, expect, it } from 'vitest'
import { PassThrough } from 'node:stream'
import { createPrompter } from '../../src/cli/lib/prompt'

function session() {
  const input = new PassThrough()
  const output = new PassThrough()
  output.resume()
  return { prompt: createPrompter(input, output), input }
}

describe('scaffold prompts', () => {
  it('selects by number and falls back on empty input', async () => {
    const first = session()
    const platforms = [
      { label: 'Both', value: 'both' as const },
      { label: 'Web', value: 'web' as const },
    ]
    const chosen = first.prompt.select('Platform', platforms, 'both')
    first.input.write('2\n')
    expect(await chosen).toBe('web')

    const fallback = first.prompt.select('Platform', platforms, 'both')
    first.input.write('\n')
    expect(await fallback).toBe('both')
    first.prompt.close()
  })

  it('uses a default and confirms yes/no', async () => {
    const sessionOne = session()
    const name = sessionOne.prompt.text('Name', 'good')
    sessionOne.input.write('\n')
    expect(await name).toBe('good')

    const install = sessionOne.prompt.confirm('Install?', true)
    sessionOne.input.write('n\n')
    expect(await install).toBe(false)
    sessionOne.prompt.close()
  })
})
