import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import { Badge, Button, Card, Page } from '../shared/ui'
import { colors, mono } from '../shared/theme'
import { complete, type ChatConfig, type ChatMessage } from './api'

const KEY = 'tardis-ts.chat.settings'
const [config, setConfig] = createSignal<ChatConfig>({
  endpoint: 'http://localhost:11434/v1/chat/completions',
  model: 'llama3.2',
  apiKey: '',
})
const [messages, setMessages] = createSignal<ChatMessage[]>([
  {
    role: 'assistant',
    content:
      'Configure an OpenAI-compatible endpoint above, then send a message. Ollama works locally; any /v1/chat/completions server should work.',
  },
])
const [draft, setDraft] = createSignal('')
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal('')
const [showSettings, setShowSettings] = createSignal(false)

try {
  const stored = localStorage?.getItem(KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as Partial<ChatConfig>
    setConfig((current) => ({ ...current, ...parsed, apiKey: '' }))
  }
} catch {
  // settings stay at defaults
}

const updateConfig = (patch: Partial<ChatConfig>): void => {
  setConfig((current) => ({ ...current, ...patch }))
  try {
    const { apiKey: _apiKey, ...safe } = { ...config(), ...patch }
    localStorage?.setItem(KEY, JSON.stringify(safe))
  } catch {
    // memory only
  }
}

const send = async (): Promise<void> => {
  const text = draft().trim()
  if (text === '' || loading()) return
  const next: ChatMessage[] = [...messages(), { role: 'user', content: text }]
  setMessages(next)
  setDraft('')
  setLoading(true)
  setError('')
  try {
    const reply = await complete(config(), next)
    setMessages([...next, { role: 'assistant', content: reply }])
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : String(reason))
  } finally {
    setLoading(false)
  }
}

const demo = (): void => {
  const last = [...messages()].reverse().find((message) => message.role === 'user')
  setMessages([
    ...messages(),
    {
      role: 'assistant',
      content: last
        ? `Demo reply (no API call): you said "${last.content}". Configure an endpoint to get a model response.`
        : 'Demo reply (no API call). Configure an endpoint to get a model response.',
    },
  ])
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Chat',
      subtitle: 'OpenAI-compatible API · native and web fetch',
      actions: [
        jsx(Button, {
          label: showSettings() ? 'Hide settings' : 'Settings',
          onClick: () => setShowSettings((value) => !value),
          primary: showSettings(),
        }),
        jsx(Button, { label: 'Demo reply', onClick: demo }),
      ],
    },
    showSettings()
      ? jsx(
          Card,
          {
            title: 'CONNECTION',
            children: [
              jsx(
                'div',
                { style: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' } },
                jsx(TextField, {
                  value: () => config().endpoint,
                  onChange: (endpoint) => updateConfig({ endpoint }),
                  ariaLabel: 'Endpoint',
                  width: 420,
                  placeholder: 'http://localhost:11434/v1/chat/completions',
                }),
                jsx(TextField, {
                  value: () => config().model,
                  onChange: (model) => updateConfig({ model }),
                  ariaLabel: 'Model',
                  width: 180,
                  placeholder: 'llama3.2',
                }),
                jsx(TextField, {
                  value: () => config().apiKey,
                  onChange: (apiKey) => updateConfig({ apiKey }),
                  ariaLabel: 'API key',
                  width: 260,
                  placeholder: 'API key (memory only)',
                })
              ),
              jsx(
                'span',
                { style: { color: colors.dim, fontSize: 11 } },
                'The API key is never written to storage. Browser requests still need CORS on the endpoint.'
              ),
            ],
          }
        )
      : null,
    jsx(
      'div',
      {
        style: {
          flexGrow: 1,
          gap: 8,
          padding: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.panel,
          minHeight: 0,
        },
      },
      ...messages().map((message, index) =>
        jsx(
          'div',
          {
            key: index,
            style: {
              flexDirection: 'row',
              gap: 8,
              alignItems: 'flex-start',
            },
          },
          jsx(Badge, {
            label: message.role === 'user' ? 'YOU' : 'AI',
            color: message.role === 'user' ? colors.accent : colors.green,
          }),
          jsx(
            'span',
            {
              style: {
                flexGrow: 1,
                color: colors.text,
                lineHeight: 20,
                fontSize: 13,
                fontFamily: message.role === 'assistant' ? mono : undefined,
              },
            },
            message.content
          )
        )
      ),
      loading()
        ? jsx('span', { style: { color: colors.muted, fontSize: 11 } }, 'Waiting for the model…')
        : null,
      error()
        ? jsx(
            'div',
            {
              role: 'alert',
              style: {
                padding: 8,
                borderRadius: 6,
                backgroundColor: '#2a1214',
                color: colors.red,
                fontSize: 12,
              },
            },
            error()
          )
        : null
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 10, alignItems: 'center' } },
      jsx(TextField, {
        value: () => draft(),
        onChange: setDraft,
        ariaLabel: 'Message',
        width: 720,
        placeholder: 'Message the model, press Enter to send',
        onSubmit: () => void send(),
      }),
      jsx(Button, {
        label: loading() ? 'Sending…' : 'Send',
        onClick: () => void send(),
        primary: true,
        disabled: loading(),
      }),
      jsx('span', { style: { color: colors.muted, fontSize: 11 } }, 'non-streaming')
    )
  )
}

render(() => jsx(App))
