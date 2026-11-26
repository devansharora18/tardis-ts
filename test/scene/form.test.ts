// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebHost, type WebHost } from '../../src/web/index'
import {
  createForm,
  createResource,
  createRoot,
  FormField,
  flushNow,
  jsx,
  render,
  TextField,
  type RenderHandle,
} from '../../src/scene/index'

let host: WebHost | null = null
let handle: RenderHandle | null = null

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  host = createWebHost({ container: document.getElementById('app')! })
})

afterEach(() => {
  handle?.dispose()
  handle = null
  host?.dispose()
  host = null
  document.body.innerHTML = ''
})

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('createForm', () => {
  it('tracks values, touched errors, submit, and reset', async () => {
    const onSubmit = vi.fn(async () => {})
    const form = createForm({
      initial: { name: '' },
      validate: (values) =>
        values.name.trim() ? {} : { name: 'Name is required' },
      onSubmit,
    })

    expect(form.values().name).toBe('')
    expect(form.field('name').error()).toBeUndefined()

    form.blur('name')
    expect(form.field('name').error()).toBe('Name is required')
    await form.submit()
    expect(onSubmit).not.toHaveBeenCalled()

    form.setValue('name', 'Ada')
    expect(form.field('name').error()).toBeUndefined()
    await form.submit()
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' })
    expect(form.submitted()).toBe(true)

    form.reset()
    expect(form.values().name).toBe('')
    expect(form.submitted()).toBe(false)
  })

  it('does not surface errors before a field is touched', () => {
    const form = createForm({
      initial: { email: '' },
      validate: () => ({ email: 'Required' }),
    })
    expect(form.errors().email).toBe('Required')
    expect(form.field('email').error()).toBeUndefined()
    form.blur('email')
    expect(form.field('email').error()).toBe('Required')
  })
})

describe('createResource', () => {
  it('loads, refetches, and exposes errors', async () => {
    let resolve: (value: string) => void = () => {}
    const fetcher = vi.fn(
      () => new Promise<string>((done) => {
        resolve = done
      })
    )
    const resource = createResource(fetcher)
    expect(resource.loading()).toBe(true)
    resolve('first')
    await tick()
    expect(resource.data()).toBe('first')
    expect(resource.loading()).toBe(false)

    resource.refetch()
    expect(resource.loading()).toBe(true)
    resolve('second')
    await tick()
    expect(resource.data()).toBe('second')
  })

  it('keeps the last request when refetches overlap', async () => {
    const resolvers: Array<(value: string) => void> = []
    const resource = createResource(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve)
        })
    )
    resource.refetch()
    expect(resolvers).toHaveLength(2)
    resolvers[1]!('newer')
    resolvers[0]!('older')
    await tick()
    expect(resource.data()).toBe('newer')
  })

  it('captures errors and stops after dispose', async () => {
    let reject: (error: Error) => void = () => {}
    const resource = createRoot((dispose) => {
      const created = createResource(() =>
        new Promise<string>((_resolve, fail) => {
          reject = fail
        })
      )
      return { created, dispose }
    })
    reject(new Error('boom'))
    await tick()
    expect(resource.created.error()?.message).toBe('boom')
    resource.dispose()
  })
})

describe('FormField', () => {
  it('renders the label, control, and error text', () => {
    handle = render(() =>
      jsx(
        FormField,
        { label: 'Name', error: () => 'Name is required' },
        jsx(TextField, { placeholder: 'Ada', ariaLabel: 'Name' })
      )
    )
    flushNow()
    expect(document.body.textContent).toContain('Name')
    expect(document.body.textContent).toContain('Ada')
    expect(document.body.textContent).toContain('Name is required')
  })
})
