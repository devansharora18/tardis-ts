export interface Place {
  name: string
  country: string
  latitude: number
  longitude: number
}

export interface Forecast {
  place: Place
  temperature: number
  humidity: number
  wind: number
  code: number
  days: Array<{ date: string; code: number; max: number; min: number }>
}

const CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + hail',
}

export function weatherLabel(code: number): string {
  return CODES[code] ?? 'Unknown'
}

export function formatTemp(celsius: number, unit: 'C' | 'F'): string {
  const value = unit === 'C' ? celsius : (celsius * 9) / 5 + 32
  return `${Math.round(value)}°${unit}`
}

export async function geocode(city: string): Promise<Place> {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`
  )
  if (!response.ok) throw new Error(`Geocoding failed (${response.status})`)
  const data = (await response.json()) as {
    results?: Array<{
      name: string
      country: string
      latitude: number
      longitude: number
    }>
  }
  const result = data.results?.[0]
  if (!result) throw new Error(`No city found for "${city}"`)
  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  }
}

export async function fetchWeather(city: string): Promise<Forecast> {
  const place = await geocode(city)
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${
      place.longitude
    }&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
  )
  if (!response.ok) throw new Error(`Forecast failed (${response.status})`)
  const data = (await response.json()) as {
    current: {
      temperature_2m: number
      relative_humidity_2m: number
      wind_speed_10m: number
      weather_code: number
    }
    daily: {
      time: string[]
      weather_code: number[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
    }
  }
  return {
    place,
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    wind: data.current.wind_speed_10m,
    code: data.current.weather_code,
    days: data.daily.time.map((date, index) => ({
      date,
      code: data.daily.weather_code[index]!,
      max: data.daily.temperature_2m_max[index]!,
      min: data.daily.temperature_2m_min[index]!,
    })),
  }
}
