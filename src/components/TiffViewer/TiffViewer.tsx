import React, { useEffect, useRef } from 'react'
import * as UTIF from 'utif'

interface TiffViewerProps {
  url: string
  className?: string
}

export const TiffViewer: React.FC<TiffViewerProps> = ({ url, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const ifds = UTIF.decode(buffer)
        if (ifds.length === 0) return

        UTIF.decodeImage(buffer, ifds[0])
        const rgba = UTIF.toRGBA8(ifds[0])
        const canvas = canvasRef.current
        if (canvas && rgba) {
          canvas.width = ifds[0].width
          canvas.height = ifds[0].height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const imageData = ctx.createImageData(canvas.width, canvas.height)
            imageData.data.set(rgba)
            ctx.putImageData(imageData, 0, 0)
          }
        }
      })
      .catch((err) => {
        throw new Error(`Error rendering TIFF image: ${err}`)
      })
  }, [url])

  return <canvas ref={canvasRef} className={className} />
}
