import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  ScrollView,
  TextField,
  type SceneEvent,
} from '@devansharora18/tardis-ts/scene'
import { complete, type ChatConfig, type ChatMessage } from './api'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

const ACCENT: Accent = accents.outlook
const STORAGE_KEY = 'tardis-ts.chat.v2'
const INTRO: ChatMessage = {
  role: 'assistant',
  content:
    'Configure an OpenAI-compatible endpoint and send a message. Ollama works locally; any /v1/chat/completions server should work.',
}
const SUGGESTIONS = [
  'Summarize the Q4 report',
  'Draft a release note',
  'Explain the benchmark loss',
]

const [config, setConfig] = createSignal<ChatConfig>({
  endpoint: 'http://localhost:11434/v1/chat/completions',
  model: 'llama3.2',
  apiKey: '',
})
const [messages, setMessages] = createSignal<ChatMessage[]>([INTRO])
const [draft, setDraft] = createSignal('')
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal('')
const [settingsOpen, setSettingsOpen] = createSignal(true)
const [status, setStatus] = createSignal('Ready')
const [scrollTop, setScrollTop] = createSignal(0)
const [viewportH, setViewportH] = createSignal(
  typeof window !== 'undefined' ? window.innerHeight : 800
)

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => setViewportH(window.innerHeight))
}

try {
  const stored = localStorage?.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as {
      config?: Partial<ChatConfig>
      messages?: ChatMessage[]
    }
    if (parsed.config) {
      setConfig((current) => ({
        ...current,
        ...parsed.config,
        apiKey: '',
      }))
    }
    if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      setMessages(parsed.messages)
    }
  }
} catch {
  // defaults remain
}

function persist(nextMessages: ChatMessage[], message: string): void {
  setMessages(nextMessages)
  setStatus(message)
  try {
    const { apiKey: _apiKey, ...safe } = config()
    localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ config: safe, messages: nextMessages })
    )
  } catch {
    setStatus('Memory only')
  }
}

function updateConfig(patch: Partial<ChatConfig>): void {
  setConfig((current) => ({ ...current, ...patch }))
  try {
    const { apiKey: _apiKey, ...safe } = { ...config(), ...patch }
    localStorage?.setItem(STORAGE_KEY, JSON.stringify({ config: safe, messages: messages() }))
    setStatus('Connection saved')
  } catch {
    setStatus('Memory only')
  }
}

function scrollToBottom(): void {
  const height = messages().reduce(
    (sum, message) => sum + 42 + Math.ceil(message.content.length / 72) * 18,
    0
  )
  setScrollTop(height)
}

async function send(): Promise<void> {
  const text = draft().trim()
  if (text === '' || loading()) return
  const next: ChatMessage[] = [...messages(), { role: 'user', content: text }]
  setMessages(next)
  setDraft('')
  setLoading(true)
  setError('')
  setStatus('Waiting for the model…')
  scrollToBottom()
  try {
    const reply = await complete(config(), next)
    persist([...next, { role: 'assistant', content: reply }], 'Reply received')
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : String(reason))
    setStatus('Request failed')
    persist(next, 'Request failed')
  } finally {
    setLoading(false)
    scrollToBottom()
  }
}

function demoReply(): void {
  const last = [...messages()].reverse().find((message) => message.role === 'user')
  const reply: ChatMessage = {
    role: 'assistant',
    content: last
      ? `Demo reply (no API call): you said "${last.content}". Configure an endpoint to get a model response.`
      : 'Demo reply (no API call). Configure an endpoint to get a model response.',
  }
  persist([...messages(), reply], 'Demo reply added')
  scrollToBottom()
}

function newChat(): void {
  persist([INTRO], 'New chat')
  setError('')
  setDraft('')
  setScrollTop(0)
}

function contentHeight(): number {
  return Math.max(
    260,
    messages().reduce(
      (sum, message) =>
        sum + 46 + Math.max(1, Math.ceil(message.content.length / 72)) * 18,
      40
    )
  )
}

function Sidebar(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 212,
        minWidth: 212,
        flexDirection: 'column',
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { padding: 10, gap: 6 } },
      jsx(
        'span',
        { style: { fontSize: 13, fontWeight: 600, color: office.ink } },
        'Tardis Chat'
      ),
      jsx(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: newChat,
          style: {
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT.main,
            borderRadius: 2,
          },
        },
        jsx(
          'span',
          { style: { fontSize: 11, color: '#ffffff', fontWeight: 600 } },
          '+ New chat'
        )
      ),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.muted, marginTop: 6 } },
        'TODAY'
      ),
      jsx(
        'div',
        {
          style: {
            padding: 7,
            gap: 2,
            backgroundColor: ACCENT.tint,
            borderWidth: 1,
            borderColor: ACCENT.main,
            borderRadius: 2,
          },
        },
        jsx(
          'span',
          { style: { fontSize: 11, color: ACCENT.dark, fontWeight: 600 } },
          'Local model'
        ),
        jsx(
          'span',
          { style: { fontSize: 9, color: office.muted } },
          dynamic(() => `${messages().length} message${messages().length === 1 ? '' : 's'}`)
        )
      ),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.muted, marginTop: 8 } },
        'SUGGESTIONS'
      ),
      ...SUGGESTIONS.map((suggestion) =>
        jsx(
          'div',
          {
            key: suggestion,
            role: 'button',
            tabIndex: 0,
            onClick: () => {
              setDraft(suggestion)
              setStatus('Suggestion added to the composer')
            },
            style: {
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 6,
              paddingRight: 6,
              borderBottomWidth: 1,
              borderColor: office.borderSoft,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 10.5, color: office.ink } },
            suggestion
          )
        )
      )
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'div',
      {
        style: {
          padding: 10,
          borderColor: office.borderSoft,
          borderWidth: 1,
          gap: 4,
        },
      },
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.muted } },
        'Connection'
      ),
      jsx(
        'span',
        { style: { fontSize: 10, color: office.ink } },
        dynamic(() => config().model)
      ),
      jsx(
        'span',
        { style: { fontSize: 9, color: office.dim, lineHeight: 13 } },
        'API key stays in memory only.'
      )
    )
  )
}

function MessageBubble(props: { message: ChatMessage; index: number }): ReturnType<typeof jsx> {
  const own = props.message.role === 'user'
  return jsx(
    'div',
    {
      style: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        justifyContent: own ? 'flex-end' : 'flex-start',
      },
    },
    own
      ? null
      : jsx(
          'div',
          {
            style: {
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ACCENT.main,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 8, fontWeight: 700, color: '#ffffff' } },
            'AI'
          )
        ),
    jsx(
      'div',
      {
        style: {
          maxWidth: 560,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 11,
          paddingRight: 11,
          gap: 3,
          backgroundColor: own ? ACCENT.main : office.surface,
          borderWidth: 1,
          borderColor: own ? ACCENT.main : office.borderSoft,
          borderRadius: 4,
        },
      },
      jsx(
        'span',
        {
          style: {
            fontSize: 12,
            lineHeight: 18,
            color: own ? '#ffffff' : office.ink,
          },
        },
        props.message.content
      )
    ),
    own
      ? jsx(
          'div',
          {
            style: {
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#d9e7f7',
            },
          },
          jsx(
            'span',
            { style: { fontSize: 8, fontWeight: 700, color: '#185abd' } },
            'DA'
          )
        )
      : null
  )
}

function Conversation(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        flexDirection: 'column',
        minWidth: 0,
        backgroundColor: '#f7f8fa',
      },
    },
    jsx(
      'div',
      {
        style: {
          height: 46,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: office.surface,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx('div', {
        style: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#107c41',
        },
      }),
      jsx(
        'span',
        { style: { fontSize: 12.5, fontWeight: 600, color: office.ink } },
        'Local model'
      ),
      jsx(
        'span',
        { style: { fontSize: 10, color: office.muted } },
        dynamic(() => config().model)
      ),
      jsx('div', { style: { flexGrow: 1 } }),
      jsx(
        'span',
        { style: { fontSize: 9.5, color: office.dim } },
        'Non-streaming'
      )
    ),
    jsx(ScrollView, {
      height: Math.max(260, viewportH() - 260),
      contentHeight: contentHeight(),
      scrollTop: () => scrollTop(),
      onScroll: setScrollTop,
      showScrollbar: true,
      children: [
        jsx(
          'div',
          { style: { padding: 16, gap: 10 } },
          ...messages().map((message, index) =>
            jsx(MessageBubble, { key: index, message, index })
          ),
          loading()
            ? jsx(
                'span',
                { style: { fontSize: 10, color: office.muted, paddingLeft: 34 } },
                'Waiting for the model…'
              )
            : null,
          error()
            ? jsx(
                'div',
                {
                  style: {
                    padding: 8,
                    backgroundColor: '#fde7e9',
                    borderWidth: 1,
                    borderColor: office.danger,
                    borderRadius: 2,
                  },
                },
                jsx(
                  'span',
                  { style: { fontSize: 10.5, color: office.danger } },
                  error()
                )
              )
            : null
        ),
      ],
    }),
    jsx(
      'div',
      {
        style: {
          padding: 10,
          gap: 5,
          backgroundColor: office.chrome,
          borderColor: office.borderSoft,
          borderWidth: 1,
        },
      },
      jsx(
        'div',
        { style: { flexDirection: 'row', gap: 6, alignItems: 'center' } },
        jsx(TextField, {
          value: () => draft(),
          onChange: setDraft,
          onSubmit: () => void send(),
          onKeyDown: (event: SceneEvent) => {
            if (event.key === 'Enter' && !event.mods?.shift) {
              event.preventDefault?.()
              void send()
            }
          },
          ariaLabel: 'Message',
          width: Math.max(320, 620),
          height: 34,
          padding: 6,
          lineHeight: 18,
          fontSize: 12,
          backgroundColor: office.surface,
          color: office.ink,
          placeholderColor: office.dim,
          selectionColor: ACCENT.tint,
          caretColor: ACCENT.main,
          borderWidth: 1,
          borderColor: office.border,
          borderRadius: 3,
          placeholder: 'Message the model, press Enter to send',
        }),
        jsx(
          'div',
          {
            role: 'button',
            tabIndex: 0,
            onClick: () => void send(),
            style: {
              width: 82,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: loading() ? office.muted : ACCENT.main,
              borderRadius: 3,
            },
          },
          jsx(
            'span',
            { style: { fontSize: 11.5, color: '#ffffff', fontWeight: 600 } },
            loading() ? 'Sending…' : 'Send'
          )
        )
      ),
      jsx(
        'span',
        { style: { fontSize: 9, color: office.dim } },
        'Enter sends · API key is never written to storage'
      )
    )
  )
}

function Settings(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 262,
        minWidth: 262,
        padding: 10,
        gap: 6,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'CONNECTION'
    ),
    jsx(TextField, {
      value: () => config().endpoint,
      onChange: (endpoint) => updateConfig({ endpoint }),
      ariaLabel: 'Endpoint',
      width: 238,
      height: 26,
      padding: 4,
      lineHeight: 16,
      fontSize: 10.5,
      backgroundColor: office.surface,
      color: office.ink,
      placeholderColor: office.dim,
      selectionColor: ACCENT.tint,
      caretColor: ACCENT.main,
      borderWidth: 1,
      borderColor: office.border,
      borderRadius: 2,
      placeholder: 'http://localhost:11434/v1/chat/completions',
    }),
    jsx(TextField, {
      value: () => config().model,
      onChange: (model) => updateConfig({ model }),
      ariaLabel: 'Model',
      width: 160,
      height: 26,
      padding: 4,
      lineHeight: 16,
      fontSize: 10.5,
      backgroundColor: office.surface,
      color: office.ink,
      placeholderColor: office.dim,
      selectionColor: ACCENT.tint,
      caretColor: ACCENT.main,
      borderWidth: 1,
      borderColor: office.border,
      borderRadius: 2,
      placeholder: 'llama3.2',
    }),
    jsx(TextField, {
      value: () => config().apiKey,
      onChange: (apiKey) => setConfig((current) => ({ ...current, apiKey })),
      ariaLabel: 'API key',
      width: 238,
      height: 26,
      padding: 4,
      lineHeight: 16,
      fontSize: 10.5,
      backgroundColor: office.surface,
      color: office.ink,
      placeholderColor: office.dim,
      selectionColor: ACCENT.tint,
      caretColor: ACCENT.main,
      borderWidth: 1,
      borderColor: office.border,
      borderRadius: 2,
      placeholder: 'API key (memory only)',
    }),
    jsx(
      'span',
      {
        style: { fontSize: 9.5, color: office.muted, lineHeight: 14 },
      },
      'Browser requests still need CORS on the endpoint. The API key is kept only in this session.'
    ),
    jsx('div', { style: { height: 1, backgroundColor: office.borderSoft, marginTop: 6 } }),
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted, marginTop: 4 } },
      'CONVERSATION'
    ),
    jsx(
      'span',
      { style: { fontSize: 11, color: office.ink } },
      dynamic(() => `${messages().filter((m) => m.role === 'user').length} prompt${messages().filter((m) => m.role === 'user').length === 1 ? '' : 's'}`)
    ),
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 4 } },
      jsx(ToolbarButton, {
        icon: 'plus',
        label: 'New chat',
        accent: ACCENT,
        onClick: newChat,
        width: 108,
      }),
      jsx(ToolbarButton, {
        icon: 'comment',
        label: 'Demo',
        accent: ACCENT,
        onClick: demoReply,
        width: 84,
      })
    ),
    jsx('div', { style: { flexGrow: 1 } }),
    jsx(
      'span',
      { style: { fontSize: 9, color: office.dim, lineHeight: 13 } },
      'Non-streaming. The host drains the QuickJS job queue after the request resolves.'
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Chat',
    initial: 'C',
    file: 'Local model.chat',
    accent: ACCENT,
    toolbar: dynamic(() =>
      jsx(Toolbar, {
        accent: ACCENT,
        children: [
          jsx(ToolbarButton, {
            icon: 'plus',
            label: 'New chat',
            accent: ACCENT,
            onClick: newChat,
          }),
          jsx(ToolbarButton, {
            icon: 'comment',
            label: 'Demo reply',
            accent: ACCENT,
            onClick: demoReply,
          }),
          jsx('div', {
            style: { width: 1, height: 20, backgroundColor: office.borderSoft, marginLeft: 4, marginRight: 4 },
          }),
          jsx(ToolbarButton, {
            icon: 'settings',
            label: 'Settings',
            accent: ACCENT,
            active: settingsOpen(),
            onClick: () => setSettingsOpen((value) => !value),
          }),
          jsx('div', { style: { flexGrow: 1 } }),
          jsx(
            'span',
            { style: { fontSize: 10.5, color: office.muted } },
            dynamic(() => config().model)
          ),
        ],
      })
    ),
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `${messages().length} message${messages().length === 1 ? '' : 's'}`)
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      'OpenAI-compatible'
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => jsx(Sidebar, {})),
        dynamic(() => jsx(Conversation, {})),
        dynamic(() => (settingsOpen() ? jsx(Settings, {}) : null))
      ),
    ],
  })
}

render(() => jsx(App))
