// Clipboard bridge.
//
// Web uses navigator.clipboard when available and falls back to an in-memory
// buffer. Native hosts can install `__tardis_ts_clipboard_read/write`; until then
// the in-memory buffer still makes copy/paste work within the app.

let memory = ''

type HostGlobals = Record<string, unknown>

function hostGlobals(): HostGlobals {
  return globalThis as unknown as HostGlobals
}

export function writeClipboard(text: string): void {
  memory = text
  const write = hostGlobals()['__tardis_ts_clipboard_write']
  if (typeof write === 'function') {
    try {
      ;(write as (value: string) => void)(text)
    } catch {
      // Native clipboard may be unavailable without a display.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => {
      // Permission denied: the in-memory buffer remains the fallback.
    })
  }
}

export function readClipboard(): string {
  const read = hostGlobals()['__tardis_ts_clipboard_read']
  if (typeof read === 'function') {
    try {
      const text = String((read as () => unknown)())
      if (text) return text
    } catch {
      // Fall through to memory.
    }
  }
  return memory
}

export function pasteClipboard(apply: (text: string) => void): void {
  const read = hostGlobals()['__tardis_ts_clipboard_read']
  if (typeof read === 'function') {
    try {
      const text = String((read as () => unknown)())
      if (text) {
        apply(text)
        return
      }
    } catch {
      // Fall through.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    void navigator.clipboard
      .readText()
      .then((text) => apply(text || memory))
      .catch(() => apply(memory))
    return
  }
  apply(memory)
}
