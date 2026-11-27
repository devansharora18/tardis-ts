import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWeather, formatTemp, weatherLabel } from '../../examples/weather/api'
import { complete } from '../../examples/chat/api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('weather api', () => {
  it('formats temperatures and weather codes', () => {
    expect(formatTemp(0, 'C')).toBe('0°C')
    expect(formatTemp(0, 'F')).toBe('32°F')
    expect(weatherLabel(0)).toBe('Clear sky')
    expect(weatherLabel(95)).toBe('Thunderstorm')
    expect(weatherLabel(999)).toBe('Unknown')
  })

  it('geocodes and maps a forecast response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Paris', country: 'France', latitude: 48.85, longitude: 2.35 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 18.4,
            relative_humidity_2m: 61,
            wind_speed_10m: 12.2,
            weather_code: 2,
          },
          daily: {
            time: ['2026-11-27'],
            weather_code: [2],
            temperature_2m_max: [21],
            temperature_2m_min: [12],
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const forecast = await fetchWeather('Paris')
    expect(forecast.place.name).toBe('Paris')
    expect(forecast.temperature).toBe(18.4)
    expect(forecast.days[0]?.max).toBe(21)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('surfaces missing cities', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    )
    await expect(fetchWeather('Nowhere')).rejects.toThrow(/No city/)
  })
})

describe('chat api', () => {
  it('posts messages and returns assistant content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const reply = await complete(
      { endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2', apiKey: '' },
      [{ role: 'user', content: 'hi' }]
    )
    expect(reply).toBe('hello')
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
    expect(body.model).toBe('llama3.2')
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('throws the API error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'bad key',
      })
    )
    await expect(
      complete(
        { endpoint: 'http://localhost/v1', model: 'm', apiKey: 'x' },
        [{ role: 'user', content: 'hi' }]
      )
    ).rejects.toThrow(/401.*bad key/)
  })
})
