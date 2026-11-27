// Form state and validation.
//
// Plain signals plus a small validation contract. No schema library: the app
// owns the rules, the form owns touched/errors/submitting state.

import { dynamic, jsx } from './jsx'
import { createSignal } from './signals'
import type { SceneNode } from './types'

export type FormErrors<T> = Partial<Record<keyof T, string>>

export interface FormOptions<T extends Record<string, unknown>> {
  initial: T
  validate?: (values: T) => FormErrors<T>
  /** Runs after sync validation passes, before `onSubmit`. */
  validateAsync?: (values: T) => Promise<FormErrors<T>>
  onSubmit?: (values: T) => void | Promise<void>
  onSubmitError?: (error: Error) => void
}

export interface FormFieldBinding<T, K extends keyof T> {
  value: () => T[K]
  onChange: (value: T[K]) => void
  onBlur: () => void
  error: () => string | undefined
}

export interface Form<T extends Record<string, unknown>> {
  values: () => T
  errors: () => FormErrors<T>
  touched: () => Partial<Record<keyof T, boolean>>
  submitting: () => boolean
  submitted: () => boolean
  submitError: () => Error | undefined
  setValue: <K extends keyof T>(key: K, value: T[K]) => void
  blur: (key: keyof T) => void
  submit: () => Promise<void>
  reset: () => void
  field: <K extends keyof T>(key: K) => FormFieldBinding<T, K>
}

function clone<T extends Record<string, unknown>>(values: T): T {
  return { ...values }
}

export function createForm<T extends Record<string, unknown>>(
  options: FormOptions<T>
): Form<T> {
  const initial = (): T => clone(options.initial)
  const initialValues = initial()
  const [values, setValues] = createSignal<T>(initialValues)
  const [errors, setErrors] = createSignal<FormErrors<T>>(
    options.validate ? options.validate(initialValues) : {}
  )
  const [touched, setTouched] = createSignal<
    Partial<Record<keyof T, boolean>>
  >({})
  const [submitting, setSubmitting] = createSignal(false)
  const [submitted, setSubmitted] = createSignal(false)
  const [submitError, setSubmitError] = createSignal<Error | undefined>(undefined)

  const validate = (next: T): FormErrors<T> =>
    options.validate ? options.validate(next) : {}

  const update = (next: T): void => {
    setValues(next)
    setErrors(validate(next))
    setSubmitted(false)
  }

  const setValue = <K extends keyof T>(key: K, value: T[K]): void => {
    update({ ...values(), [key]: value })
  }

  const blur = (key: keyof T): void => {
    setTouched({ ...touched(), [key]: true })
    setErrors(validate(values()))
  }

  const submit = async (): Promise<void> => {
    const allTouched = Object.fromEntries(
      Object.keys(values()).map((key) => [key, true])
    ) as Partial<Record<keyof T, boolean>>
    setTouched(allTouched)
    let nextErrors = validate(values())
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      if (options.validateAsync) {
        nextErrors = await options.validateAsync(values())
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return
      }
      await options.onSubmit?.(values())
      setSubmitted(true)
    } catch (reason) {
      const error =
        reason instanceof Error ? reason : new Error(String(reason))
      setSubmitError(error)
      options.onSubmitError?.(error)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = (): void => {
    setValues(initial())
    setErrors({})
    setTouched({})
    setSubmitted(false)
    setSubmitError(undefined)
  }

  const field = <K extends keyof T>(key: K): FormFieldBinding<T, K> => ({
    value: () => values()[key],
    onChange: (value: T[K]) => setValue(key, value),
    onBlur: () => blur(key),
    error: () => (touched()[key] ? errors()[key] : undefined),
  })

  return {
    values,
    errors,
    touched,
    submitting,
    submitted,
    submitError,
    setValue,
    blur,
    submit,
    reset,
    field,
  }
}

type MaybeGetter<T> = T | (() => T)

function read<T>(value: MaybeGetter<T> | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return typeof value === 'function' ? (value as () => T)() : value
}

export interface FormFieldProps {
  label: MaybeGetter<string>
  error?: MaybeGetter<string | undefined>
  hint?: MaybeGetter<string | undefined>
  children?: unknown
}

/** Label + control + error/hint, with the same layout on both hosts. */
export function FormField(props: FormFieldProps): SceneNode {
  return jsx(
    'div',
    { style: { flexDirection: 'column', gap: 4 } },
    jsx(
      'label',
      { style: { fontSize: 13, color: '#a1a1a1' } },
      read(props.label, '')
    ),
    ...(Array.isArray(props.children)
      ? props.children
      : props.children === undefined
        ? []
        : [props.children]),
    dynamic(() => {
      const error = read(props.error, undefined)
      if (error) {
        return jsx(
          'span',
          { style: { fontSize: 12, color: '#ff7b72' } },
          error
        )
      }
      const hint = read(props.hint, undefined)
      if (hint) {
        return jsx('span', { style: { fontSize: 12, color: '#666666' } }, hint)
      }
      return null
    })
  )
}
