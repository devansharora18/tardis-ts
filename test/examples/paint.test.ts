import { describe, expect, it } from 'vitest'
import { unzlibSync } from 'fflate'
import { createSurface, line, stamp } from '../../examples/paint/engine'
import { base64, encodePng } from '../../examples/paint/png'

function bytesFromDataUrl(url: string): Uint8Array {
  const raw = atob(url.split(',')[1]!)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

describe('paint engine', () => {
  it('stamps and draws lines into the surface', () => {
    const pixels = createSurface(20, 20)
    stamp(pixels, 20, 20, { x: 5, y: 5 }, 2, '#ff0000')
    expect([...pixels.slice((5 * 20 + 5) * 4, (5 * 20 + 5) * 4 + 3)]).toEqual([
      255, 0, 0,
    ])
    line(pixels, 20, 20, { x: 2, y: 10 }, { x: 18, y: 10 }, 1, '#0000ff')
    expect([...pixels.slice((10 * 20 + 10) * 4, (10 * 20 + 10) * 4 + 3)]).toEqual([
      0, 0, 255,
    ])
  })

  it('encodes a decodable PNG with the right pixels', () => {
    const pixels = createSurface(3, 2, '#ff0000')
    const url = encodePng(3, 2, pixels)
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    const png = bytesFromDataUrl(url)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    const view = new DataView(png.buffer, png.byteOffset)
    expect(view.getUint32(16)).toBe(3)
    expect(view.getUint32(20)).toBe(2)
    // first IDAT chunk starts after signature + IHDR (8 + 25)
    const idatLength = view.getUint32(33)
    const idat = png.slice(41, 41 + idatLength)
    const raw = unzlibSync(idat)
    expect(raw.length).toBe((3 * 4 + 1) * 2)
    expect(raw[0]).toBe(0)
    expect([...raw.slice(1, 5)]).toEqual([255, 0, 0, 255])
  })

  it('base64 matches btoa for arbitrary bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255])
    expect(base64(bytes)).toBe(btoa(String.fromCharCode(...bytes)))
  })
})
