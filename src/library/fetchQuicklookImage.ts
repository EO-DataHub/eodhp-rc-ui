import * as UTIF from 'utif'

/**
 * Checks if a blob/URL represents a TIF file by checking Content-Type and URL extension.
 */
function isTiffFile(blob: Blob, url: string): boolean {
  // Check Content-Type
  if (blob.type) {
    const contentType = blob.type.toLowerCase()
    if (contentType === 'image/tiff' || contentType === 'image/tif') {
      return true
    }
  }

  // Check URL extension
  const urlLower = url.toLowerCase()
  if (urlLower.endsWith('.tif') || urlLower.endsWith('.tiff')) {
    return true
  }

  return false
}

/**
 * Decodes a TIF blob to a canvas using the utif library.
 * Similar to how TiffViewer handles TIF files.
 */
async function decodeTiffToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const buffer = await blob.arrayBuffer()
  const ifds = UTIF.decode(buffer)

  if (ifds.length === 0) {
    throw new Error('Failed to decode TIF: No image data found')
  }

  UTIF.decodeImage(buffer, ifds[0])
  const rgba = UTIF.toRGBA8(ifds[0])

  const canvas = document.createElement('canvas')
  canvas.width = ifds[0].width
  canvas.height = ifds[0].height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  const imageData = ctx.createImageData(canvas.width, canvas.height)
  imageData.data.set(rgba)
  ctx.putImageData(imageData, 0, 0)

  return canvas
}

/**
 * Processes an image blob to make black pixels transparent.
 * Similar to how TiffViewer handles black pixels.
 * Handles both TIF files (using utif) and regular images (using Image API).
 */
async function processImageToRemoveBlackBackground(blob: Blob, url: string): Promise<string> {
  const isTiff = isTiffFile(blob, url)

  if (isTiff) {
    // Handle TIF files using utif library
    const canvas = await decodeTiffToCanvas(blob)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Process pixels: make black pixels transparent
    // Check if R=G=B=0 (pure black) or very close to 0 (threshold: < 10)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      // If all RGB values are below threshold, make transparent
      if (r < 10 && g < 10 && b < 10) {
        data[i + 3] = 0 // Set alpha to 0 (transparent)
      }
    }

    // Put the processed image data back
    ctx.putImageData(imageData, 0, 0)

    // Convert canvas to blob and create object URL
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (processedBlob) => {
          if (processedBlob) {
            resolve(URL.createObjectURL(processedBlob))
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/png', // Use PNG to preserve transparency
      )
    })
  }

  // Handle regular images (JPG/PNG) using Image API
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(blob)

    img.onload = () => {
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl)

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Draw the image to the canvas
      ctx.drawImage(img, 0, 0)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Process pixels: make black pixels transparent
      // Check if R=G=B=0 (pure black) or very close to 0 (threshold: < 10)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // If all RGB values are below threshold, make transparent
        if (r < 10 && g < 10 && b < 10) {
          data[i + 3] = 0 // Set alpha to 0 (transparent)
        }
      }

      // Put the processed image data back
      ctx.putImageData(imageData, 0, 0)

      // Convert canvas to blob and create object URL
      canvas.toBlob(
        (processedBlob) => {
          if (processedBlob) {
            resolve(URL.createObjectURL(processedBlob))
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/png', // Use PNG to preserve transparency
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = blobUrl
  })
}

export const fetchQuicklookImage = async ({
  url,
  token,
  removeBlackBackground = false,
}: {
  url: string
  token?: string
  removeBlackBackground?: boolean
}): Promise<string> => {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Failed to fetch image')
  const blob = await response.blob()

  // Check if this is a TIF file
  const isTiff = isTiffFile(blob, url)

  // TIF files need to be decoded and converted to PNG for browser compatibility
  // Even if removeBlackBackground is false, we still need to convert TIF to PNG
  if (isTiff) {
    if (removeBlackBackground) {
      // Process TIF and remove black background
      return processImageToRemoveBlackBackground(blob, url)
    } else {
      // Just decode TIF to PNG without black background removal
      const canvas = await decodeTiffToCanvas(blob)
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (processedBlob) => {
            if (processedBlob) {
              resolve(URL.createObjectURL(processedBlob))
            } else {
              reject(new Error('Failed to convert canvas to blob'))
            }
          },
          'image/png', // Convert to PNG for browser compatibility
        )
      })
    }
  }

  // For non-TIF files, process black background removal if requested
  if (removeBlackBackground) {
    return processImageToRemoveBlackBackground(blob, url)
  }

  // Regular images can be used directly
  return URL.createObjectURL(blob)
}

export const fetchThumbnailImage = async ({
  url,
  token,
}: {
  url: string
  token?: string
}): Promise<string> => {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Failed to fetch thumbnail')
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
