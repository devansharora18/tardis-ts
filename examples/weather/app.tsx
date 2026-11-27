import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import { Badge, Button, Card, Page } from '../shared/ui'
import { colors } from '../shared/theme'
import { fetchWeather, formatTemp, weatherLabel, type Forecast } from './api'

const [city, setCity] = createSignal('San Francisco')
const [unit, setUnit] = createSignal<'C' | 'F'>('C')
const [forecast, setForecast] = createSignal<Forecast | null>(null)
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal('')
const [status, setStatus] = createSignal('Search a city to load live weather')

const search = async (): Promise<void> => {
  const value = city().trim()
  if (value === '') return
  setLoading(true)
  setError('')
  setStatus(`Fetching ${value}…`)
  try {
    const data = await fetchWeather(value)
    setForecast(data)
    setStatus(`Live data for ${data.place.name}, ${data.place.country}`)
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : String(reason))
    setStatus('Request failed')
  } finally {
    setLoading(false)
  }
}

function App(): ReturnType<typeof jsx> {
  return jsx(
    Page,
    {
      title: 'Tardis Weather',
      subtitle: 'Open-Meteo API · native fetch and browser fetch',
      actions: [
        jsx(Button, {
          label: unit() === 'C' ? '°C' : '°F',
          onClick: () => setUnit((value) => (value === 'C' ? 'F' : 'C')),
        }),
        jsx(Button, { label: 'Search', onClick: () => void search(), primary: true }),
      ],
    },
    jsx(
      'div',
      { style: { flexDirection: 'row', gap: 10, alignItems: 'center' } },
      jsx(TextField, {
        value: () => city(),
        onChange: setCity,
        ariaLabel: 'City',
        width: 320,
        placeholder: 'City name',
        onSubmit: () => void search(),
      }),
      jsx('span', { style: { color: colors.muted, fontSize: 11 } }, dynamic(() => status()))
    ),
    error()
      ? jsx(
          'div',
          {
            role: 'alert',
            style: {
              padding: 10,
              borderRadius: 8,
              backgroundColor: '#2a1214',
              color: colors.red,
              fontSize: 12,
            },
          },
          error()
        )
      : null,
    dynamic(() => {
      if (loading()) {
        return jsx(
          'div',
          { style: { padding: 40, alignItems: 'center', color: colors.muted } },
          'Loading forecast…'
        )
      }
      const data = forecast()
      if (!data) {
        return jsx(Card, {
          title: 'NO DATA YET',
          children: [
            jsx(
              'span',
              { style: { color: colors.muted, lineHeight: 20 } },
              'Type a city and press Enter. The same code calls the Open-Meteo API on desktop and web.'
            ),
          ],
        })
      }
      return jsx(
        'div',
        { style: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' } },
        jsx(
          Card,
          {
            title: data.place.name,
            children: [
              jsx(
                'span',
                { style: { fontSize: 54, fontWeight: 700, color: colors.text } },
                formatTemp(data.temperature, unit())
              ),
              jsx('span', { style: { color: colors.muted } }, weatherLabel(data.code)),
              jsx(
                'div',
                { style: { flexDirection: 'row', gap: 8, marginTop: 6 } },
                jsx(Badge, { label: `${data.humidity}% humidity` }),
                jsx(Badge, { label: `${Math.round(data.wind)} km/h wind`, color: colors.green })
              ),
              jsx(
                'span',
                { style: { color: colors.dim, fontSize: 11 } },
                `${data.place.country} · ${data.place.latitude.toFixed(2)}, ${data.place.longitude.toFixed(2)}`
              ),
            ],
          }
        ),
        jsx(
          Card,
          {
            title: '7-DAY FORECAST',
            grow: true,
            children: [
              jsx(
                'div',
                { style: { flexDirection: 'row', gap: 8 } },
                ...data.days.map((day) =>
                  jsx(
                    'div',
                    {
                      key: day.date,
                      style: {
                        flexGrow: 1,
                        padding: 10,
                        gap: 5,
                        borderRadius: 8,
                        backgroundColor: colors.panel2,
                      },
                    },
                    jsx(
                      'span',
                      { style: { color: colors.muted, fontSize: 11 } },
                      new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'short',
                      })
                    ),
                    jsx('span', { style: { color: colors.text, fontSize: 18, fontWeight: 600 } },
                      formatTemp(day.max, unit())
                    ),
                    jsx('span', { style: { color: colors.dim, fontSize: 11 } },
                      formatTemp(day.min, unit())
                    ),
                    jsx('span', { style: { color: colors.muted, fontSize: 10 } },
                      weatherLabel(day.code)
                    )
                  )
                )
              ),
            ],
          }
        )
      )
    })
  )
}

render(() => jsx(App))
