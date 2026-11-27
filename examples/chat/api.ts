export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatConfig {
  endpoint: string
  model: string
  apiKey: string
}

export async function complete(
  config: ChatConfig,
  messages: ChatMessage[]
): Promise<string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (config.apiKey.trim() !== '') {
    headers.authorization = `Bearer ${config.apiKey.trim()}`
  }
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`API ${response.status}: ${body.slice(0, 200)}`)
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('API returned no message content')
  return content
}
