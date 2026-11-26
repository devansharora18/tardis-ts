// Interactive prompt helpers for the scaffolder.
//
// Uses Node's readline/promises with no extra dependency. Non-TTY runs should
// pass explicit options instead of calling these.

import readline from 'node:readline/promises'

export interface Choice<T extends string> {
  label: string
  value: T
  hint?: string
}

export interface Prompter {
  text(question: string, fallback?: string, validate?: (value: string) => string | null): Promise<string>
  select<T extends string>(question: string, choices: Choice<T>[], fallback: T): Promise<T>
  confirm(question: string, fallback: boolean): Promise<boolean>
  close(): void
}

export function isInteractive(): boolean {
  return (
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    process.env['CI'] !== 'true' &&
    process.env['TARDIS_TS_NO_PROMPT'] !== '1'
  )
}

export function createPrompter(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout
): Prompter {
  const rl = readline.createInterface({ input, output })

  return {
    async text(question, fallback = '', validate) {
      while (true) {
        const suffix = fallback ? ` (${fallback})` : ''
        const answer = (await rl.question(`? ${question}${suffix}: `)).trim()
        const value = answer || fallback
        const error = validate ? validate(value) : null
        if (error) {
          console.log(`  ${error}`)
          continue
        }
        return value
      }
    },

    async select(question, choices, fallback) {
      console.log(`? ${question}`)
      choices.forEach((choice, index) => {
        const marker = choice.value === fallback ? '❯' : ' '
        const hint = choice.hint ? `  ${choice.hint}` : ''
        console.log(`  ${marker} ${index + 1}) ${choice.label}${hint}`)
      })
      while (true) {
        const defaultIndex = choices.findIndex((choice) => choice.value === fallback)
        const answer = (await rl.question(`  choose 1-${choices.length} (${defaultIndex + 1}): `)).trim()
        if (!answer) return choices[defaultIndex]!.value
        const index = Number.parseInt(answer, 10) - 1
        if (index >= 0 && index < choices.length) return choices[index]!.value
        console.log(`  enter a number between 1 and ${choices.length}`)
      }
    },

    async confirm(question, fallback) {
      const suffix = fallback ? 'Y/n' : 'y/N'
      while (true) {
        const answer = (await rl.question(`? ${question} (${suffix}): `)).trim().toLowerCase()
        if (!answer) return fallback
        if (answer === 'y' || answer === 'yes') return true
        if (answer === 'n' || answer === 'no') return false
        console.log('  answer y or n')
      }
    },

    close() {
      rl.close()
    },
  }
}
