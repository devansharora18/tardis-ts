export interface Point {
  x: number
  y: number
}

export function createSurface(width: number, height: number, color = '#ffffff'): Uint8Array {
  const pixels = new Uint8Array(width * height * 4)
  const [r, g, b] = parseHex(color)
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = r
    pixels[index + 1] = g
    pixels[index + 2] = b
    pixels[index + 3] = 255
  }
  return pixels
}

export function parseHex(color: string): [number, number, number] {
  const hex = color.replace('#', '')
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

export function stamp(
  pixels: Uint8Array,
  width: number,
  height: number,
  point: Point,
  radius: number,
  color: string
): void {
  const [r, g, b] = parseHex(color)
  const minX = Math.max(0, Math.floor(point.x - radius))
  const maxX = Math.min(width - 1, Math.ceil(point.x + radius))
  const minY = Math.max(0, Math.floor(point.y - radius))
  const maxY = Math.min(height - 1, Math.ceil(point.y + radius))
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = (x - point.x) ** 2 + (y - point.y) ** 2
      if (distance > radius * radius) continue
      const at = (y * width + x) * 4
      pixels[at] = r
      pixels[at + 1] = g
      pixels[at + 2] = b
      pixels[at + 3] = 255
    }
  }
}

export function line(
  pixels: Uint8Array,
  width: number,
  height: number,
  from: Point,
  to: Point,
  radius: number,
  color: string
): void {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 2)))
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    stamp(
      pixels,
      width,
      height,
      { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      radius,
      color
    )
  }
}
