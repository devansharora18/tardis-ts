import '@devansharora18/tardis-ts/web'
import {
  createSignal,
  dynamic,
  jsx,
  render,
  TextField,
} from '@devansharora18/tardis-ts/scene'
import { fetchWeather, formatTemp, weatherLabel, type Forecast, type Place } from './api'
import {
  accents,
  DesktopApp,
  office,
  Toolbar,
  ToolbarButton,
  type Accent,
} from '../shared/office'

const ACCENT: Accent = accents.outlook
const PLACES_KEY = 'tardis-ts.weather.places.v2'
const UNITS_KEY = 'tardis-ts.weather.unit'

const [city, setCity] = createSignal('San Francisco')
const [unit, setUnit] = createSignal<'C' | 'F'>(loadUnit())
const [forecast, setForecast] = createSignal<Forecast | null>(null)
const [loading, setLoading] = createSignal(false)
const [error, setError] = createSignal('')
const [status, setStatus] = createSignal('Search a city to load live weather')
const [places, setPlaces] = createSignal<Place[]>(loadPlaces())

function loadUnit(): 'C' | 'F' {
  if (typeof localStorage === 'undefined') return 'C'
  return localStorage.getItem(UNITS_KEY) === 'F' ? 'F' : 'C'
}

function loadPlaces(): Place[] {
  const fallback: Place[] = [
    { name: 'San Francisco', country: 'United States', latitude: 37.77, longitude: -122.42 },
    { name: 'London', country: 'United Kingdom', latitude: 51.51, longitude: -0.13 },
    { name: 'Tokyo', country: 'Japan', latitude: 35.68, longitude: 139.69 },
  ]
  if (typeof localStorage === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(PLACES_KEY)
    if (!stored) return fallback
    const parsed = JSON.parse(stored) as Place[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

function savePlaces(next: Place[]): void {
  setPlaces(next)
  try {
    localStorage?.setItem(PLACES_KEY, JSON.stringify(next))
  } catch {
    // memory only
  }
}

function setUnits(next: 'C' | 'F'): void {
  setUnit(next)
  try {
    localStorage?.setItem(UNITS_KEY, next)
  } catch {
    // memory only
  }
  setStatus(`Showing °${next}`)
}

async function search(value?: string): Promise<void> {
  const name = (value ?? city()).trim()
  if (name === '') return
  setCity(name)
  setLoading(true)
  setError('')
  setStatus(`Fetching ${name}…`)
  try {
    const data = await fetchWeather(name)
    setForecast(data)
    setStatus(`Live data for ${data.place.name}, ${data.place.country}`)
    if (!places().some((place) => place.name === data.place.name)) {
      savePlaces([data.place, ...places()].slice(0, 8))
    }
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : String(reason))
    setStatus('Request failed')
  } finally {
    setLoading(false)
  }
}

function WeatherGlyph(props: { code: number; size: number; accent?: string }): ReturnType<typeof jsx> {
  const size = props.size
  const clear = props.code === 0 || props.code === 1
  const cloud = props.code === 2 || props.code === 3 || props.code === 45 || props.code === 48
  const rain = (props.code >= 51 && props.code <= 65) || (props.code >= 80 && props.code <= 82)
  const snow = props.code >= 71 && props.code <= 75
  const storm = props.code >= 95
  return jsx(
    'div',
    { style: { width: size, height: size, position: 'relative' } },
    clear
      ? jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.18,
            top: size * 0.18,
            width: size * 0.64,
            height: size * 0.64,
            borderRadius: size * 0.32,
            backgroundColor: '#f5c542',
          },
        })
      : null,
    clear && props.code === 1
      ? jsx('div', {
          style: {
            position: 'absolute',
            right: size * 0.1,
            bottom: size * 0.12,
            width: size * 0.44,
            height: size * 0.26,
            borderRadius: size * 0.13,
            backgroundColor: '#d7dee8',
          },
        })
      : null,
    cloud || rain || snow || storm
      ? jsx(
          'div',
          { style: { position: 'absolute', left: 0, top: size * 0.26, width: size, height: size * 0.5 } },
          jsx('div', {
            style: {
              position: 'absolute',
              left: size * 0.1,
              top: size * 0.2,
              width: size * 0.5,
              height: size * 0.3,
              borderRadius: size * 0.15,
              backgroundColor: storm ? '#8a8886' : '#c8d0da',
            },
          }),
          jsx('div', {
            style: {
              position: 'absolute',
              left: size * 0.34,
              top: 0,
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: size * 0.2,
              backgroundColor: storm ? '#a19f9d' : '#e1e6ec',
            },
          }),
          jsx('div', {
            style: {
              position: 'absolute',
              left: size * 0.42,
              top: size * 0.28,
              width: size * 0.5,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: storm ? '#8a8886' : '#d7dee8',
            },
          })
        )
      : null,
    rain
      ? jsx(
          'div',
          { style: { position: 'absolute', left: 0, top: size * 0.62, width: size, height: size * 0.34 } },
          ...[0.26, 0.44, 0.62].map((left) =>
            jsx('div', {
              key: left,
              style: {
                position: 'absolute',
                left: size * left,
                top: 0,
                width: Math.max(2, size * 0.055),
                height: size * (left === 0.44 ? 0.3 : 0.22),
                backgroundColor: '#4f8dcc',
              },
            })
          )
        )
      : null,
    snow
      ? jsx(
          'div',
          { style: { position: 'absolute', left: 0, top: size * 0.66, width: size } },
          ...[0.28, 0.48, 0.68].map((left) =>
            jsx('div', {
              key: left,
              style: {
                position: 'absolute',
                left: size * left,
                width: size * 0.08,
                height: size * 0.08,
                borderRadius: size * 0.04,
                backgroundColor: '#9dc3e6',
              },
            })
          )
        )
      : null,
    storm
      ? jsx('div', {
          style: {
            position: 'absolute',
            left: size * 0.44,
            top: size * 0.66,
            width: size * 0.08,
            height: size * 0.26,
            backgroundColor: '#f5c542',
          },
        })
      : null
  )
}

function Places(): ReturnType<typeof jsx> {
  return jsx(
    'div',
    {
      style: {
        width: 226,
        minWidth: 226,
        padding: 10,
        gap: 4,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'SAVED PLACES'
    ),
    ...places().map((place) =>
      jsx(
        'div',
        {
          key: `${place.name}-${place.country}`,
          role: 'button',
          tabIndex: 0,
          onClick: () => void search(place.name),
          style: () => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 7,
            paddingRight: 7,
            borderRadius: 2,
            backgroundColor:
              forecast()?.place.name === place.name ? ACCENT.tint : 'transparent',
            borderWidth: 1,
            borderColor:
              forecast()?.place.name === place.name ? ACCENT.main : 'transparent',
          }),
        },
        jsx('div', {
          style: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: ACCENT.main,
          },
        }),
        jsx(
          'div',
          { style: { flexGrow: 1, gap: 1 } },
          jsx(
            'span',
            { style: { fontSize: 11.5, color: office.ink } },
            place.name
          ),
          jsx(
            'span',
            { style: { fontSize: 9, color: office.muted } },
            place.country
          )
        )
      )
    ),
    jsx(
      'span',
      { style: { fontSize: 9, color: office.dim, lineHeight: 13, marginTop: 6 } },
      'Live data from Open-Meteo. Saved places and units stay on this device.'
    )
  )
}

function CurrentCard(): ReturnType<typeof jsx> {
  const data = forecast()
  if (!data) {
    return jsx(
      'div',
      {
        style: {
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: office.surface,
          borderColor: office.border,
          borderWidth: 1,
        },
      },
      jsx(WeatherGlyph, { code: 0, size: 56 }),
      jsx(
        'span',
        { style: { fontSize: 16, fontWeight: 600, color: office.ink } },
        loading() ? 'Loading forecast…' : 'Search a city'
      ),
      jsx(
        'span',
        { style: { fontSize: 11, color: office.muted } },
        'The same code calls Open-Meteo from desktop and web.'
      )
    )
  }
  return jsx(
    'div',
    {
      style: {
        flexGrow: 1,
        flexDirection: 'row',
        gap: 16,
        padding: 22,
        backgroundColor: '#eef6ff',
        borderColor: office.border,
        borderWidth: 1,
      },
    },
    jsx(
      'div',
      { style: { flexGrow: 1, gap: 2, justifyContent: 'center' } },
      jsx(
        'span',
        { style: { fontSize: 13, color: ACCENT.dark, fontWeight: 600 } },
        `${data.place.name}, ${data.place.country}`
      ),
      jsx(
        'span',
        {
          style: {
            fontSize: 62,
            fontWeight: 600,
            color: office.ink,
            lineHeight: 68,
          },
        },
        formatTemp(data.temperature, unit())
      ),
      jsx(
        'span',
        { style: { fontSize: 15, color: office.muted } },
        weatherLabel(data.code)
      ),
      jsx(
        'span',
        { style: { fontSize: 10, color: office.dim, marginTop: 4 } },
        `Feels like ${formatTemp(data.temperature, unit())} · Humidity ${data.humidity}% · Wind ${Math.round(data.wind)} km/h`
      )
    ),
    jsx(
      'div',
      { style: { alignItems: 'center', justifyContent: 'center' } },
      jsx(WeatherGlyph, { code: data.code, size: 104 })
    )
  )
}

function ForecastStrip(): ReturnType<typeof jsx> {
  const data = forecast()
  if (!data) return jsx('div', {})
  return jsx(
    'div',
    {
      style: {
        height: 138,
        flexDirection: 'row',
        gap: 1,
        backgroundColor: office.borderSoft,
        borderWidth: 1,
        borderColor: office.borderSoft,
      },
    },
    ...data.days.map((day) =>
      jsx(
        'div',
        {
          key: day.date,
          style: {
            flexGrow: 1,
            paddingTop: 9,
            paddingBottom: 7,
            gap: 5,
            alignItems: 'center',
            backgroundColor: office.surface,
          },
        },
        jsx(
          'span',
          { style: { fontSize: 9.5, color: office.muted } },
          new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: 'short',
          })
        ),
        jsx(WeatherGlyph, { code: day.code, size: 28 }),
        jsx(
          'span',
          { style: { fontSize: 12, color: office.ink, fontWeight: 600 } },
          formatTemp(day.max, unit())
        ),
        jsx(
          'span',
          { style: { fontSize: 10, color: office.dim } },
          formatTemp(day.min, unit())
        )
      )
    )
  )
}

function Details(): ReturnType<typeof jsx> {
  const data = forecast()
  return jsx(
    'div',
    {
      style: {
        width: 244,
        minWidth: 244,
        padding: 12,
        gap: 6,
        backgroundColor: office.chrome,
        borderColor: office.borderSoft,
        borderWidth: 1,
      },
    },
    jsx(
      'span',
      { style: { fontSize: 10, fontWeight: 600, color: office.muted } },
      'DETAILS'
    ),
    ...(data
      ? [
          ['Humidity', `${data.humidity}%`],
          ['Wind', `${Math.round(data.wind)} km/h`],
          ['Latitude', data.place.latitude.toFixed(2)],
          ['Longitude', data.place.longitude.toFixed(2)],
          ['Source', 'Open-Meteo'],
        ]
      : [['Status', loading() ? 'Loading' : 'No city selected']]
    ).map(([label, value]) =>
      jsx(
        'div',
        {
          key: label,
          style: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: 3,
            paddingBottom: 3,
            borderBottomWidth: 1,
            borderColor: office.borderSoft,
          },
        },
        jsx('span', { style: { fontSize: 10, color: office.muted } }, label!),
        jsx('span', { style: { fontSize: 10.5, color: office.ink } }, value!)
      )
    ),
    jsx(
      'span',
      { style: { fontSize: 9.5, color: office.dim, lineHeight: 14, marginTop: 4 } },
      'Forecast refreshes on every search. No API key is required.'
    )
  )
}

function App(): ReturnType<typeof jsx> {
  return jsx(DesktopApp, {
    app: 'Tardis Weather',
    initial: 'W',
    file: 'Live forecast',
    accent: ACCENT,
    toolbar: jsx(Toolbar, {
      accent: ACCENT,
      children: [
        jsx(TextField, {
          value: () => city(),
          onChange: setCity,
          onSubmit: () => void search(),
          ariaLabel: 'City',
          width: 260,
          height: 27,
          padding: 4,
          lineHeight: 16,
          fontSize: 11,
          backgroundColor: office.surface,
          color: office.ink,
          placeholderColor: office.dim,
          selectionColor: ACCENT.tint,
          caretColor: ACCENT.main,
          borderWidth: 1,
          borderColor: office.border,
          borderRadius: 2,
          placeholder: 'City name',
        }),
        jsx(ToolbarButton, {
          icon: 'search',
          label: 'Search',
          accent: ACCENT,
          onClick: () => void search(),
        }),
        jsx(ToolbarButton, {
          icon: 'check',
          label: unit() === 'C' ? '°C' : '°F',
          accent: ACCENT,
          onClick: () => setUnits(unit() === 'C' ? 'F' : 'C'),
        }),
        jsx(ToolbarButton, {
          icon: 'redo',
          label: 'Refresh',
          accent: ACCENT,
          onClick: () => void search(forecast()?.place.name ?? city()),
          disabled: !forecast(),
        }),
        jsx('div', { style: { flexGrow: 1 } }),
        jsx(
          'span',
          { style: { fontSize: 10.5, color: office.muted } },
          dynamic(() => status())
        ),
      ],
    }),
    statusLeft: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => status())
    ),
    statusCenter: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => (forecast() ? `${forecast()!.days.length}-day forecast` : 'No data'))
    ),
    statusRight: jsx(
      'span',
      { style: { color: '#ffffff', fontSize: 10.5 } },
      dynamic(() => `Open-Meteo · °${unit()}`)
    ),
    children: [
      jsx(
        'div',
        { style: { flexGrow: 1, flexDirection: 'row', minHeight: 0 } },
        dynamic(() => jsx(Places, {})),
        jsx(
          'div',
          {
            style: {
              flexGrow: 1,
              flexDirection: 'column',
              gap: 8,
              padding: 10,
              minWidth: 0,
              backgroundColor: '#e6e6e6',
            },
          },
          error()
            ? jsx(
                'div',
                {
                  style: {
                    padding: 8,
                    backgroundColor: '#fde7e9',
                    borderWidth: 1,
                    borderColor: office.danger,
                  },
                },
                jsx(
                  'span',
                  { style: { fontSize: 10.5, color: office.danger } },
                  error()
                )
              )
            : null,
          dynamic(() => jsx(CurrentCard, {})),
          dynamic(() => jsx(ForecastStrip, {}))
        ),
        dynamic(() => jsx(Details, {}))
      ),
    ],
  })
}

render(() => jsx(App))

if (typeof fetch === 'function') {
  void search('San Francisco')
}
