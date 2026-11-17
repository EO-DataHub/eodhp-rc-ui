import type { PixelRing } from './quicklookCorners'

/**
 * Makes the parts of an image outside the given rings transparent, and returns the result as a
 * PNG. `ringsFor` gets the decoded image's size and returns the rings in its pixels, or
 * undefined to leave the image as it is.
 *
 * Use it for a quicklook with an opaque border around the data, such as a JPEG, which has no
 * alpha channel. MapLibre cannot make a colour transparent by itself.
 */
export async function maskOutside(
  image: Blob,
  ringsFor: (width: number, height: number) => PixelRing[] | undefined,
): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  try {
    const rings = ringsFor(bitmap.width, bitmap.height)
    if (!rings || rings.length === 0) return image

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return image
    context.drawImage(bitmap, 0, 0)

    // Keep only the pixels that the rings cover.
    context.globalCompositeOperation = 'destination-in'
    context.beginPath()
    for (const ring of rings) {
      ring.forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)))
      context.closePath()
    }
    context.fill('evenodd')

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (png) => (png ? resolve(png) : reject(new Error('Could not encode the masked image'))),
        'image/png',
      ),
    )
  } finally {
    bitmap.close()
  }
}
