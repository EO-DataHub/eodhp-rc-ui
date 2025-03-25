import { useEffect, useRef, useState } from 'react'
import { scaleLinear } from '@visx/scale'
import { AxisBottom } from '@visx/axis'
import { Item } from '@/types'

const HEIGHT = 50
const GRADIENT_HEIGHT = 20
const MARGIN = { top: 0, bottom: 0, left: 10, right: 10 }

interface LegendProps {
  item: Item
}

const Legend = ({ item }: LegendProps) => {
  const colorMap = item?.render?.colormap
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1)

  // SVGs require an absolute width, so we calculate the container width
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          setWidth(entry.contentRect.width)
        }
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  if (!colorMap || width === 0) return null

  const domain = Object.keys(colorMap)
    .map(Number)
    .sort((a, b) => a - b)
  const range = domain.map((d) => colorMap[d])

  const innerWidth = width - MARGIN.left - MARGIN.right

  const xScale = scaleLinear({
    domain: [0, 255],
    range: [0, innerWidth],
  })

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={HEIGHT}>
        <defs>
          <linearGradient id="legend-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {domain.map((value, index) => (
              <stop key={value} offset={`${(value / 255) * 100}%`} stopColor={range[index]} />
            ))}
          </linearGradient>
        </defs>

        <rect
          x={MARGIN.left}
          y={0}
          width={innerWidth}
          height={GRADIENT_HEIGHT}
          fill="url(#legend-gradient)"
          stroke="#000"
        />

        <AxisBottom
          top={GRADIENT_HEIGHT + 5}
          left={MARGIN.left}
          scale={xScale}
          tickValues={[0, 50, 100, 150, 200, 255]}
          tickFormat={(d) => `${Number(d)}`}
          tickLabelProps={() => ({
            fill: '#000',
            fontSize: 10,
            textAnchor: 'middle',
          })}
          stroke="#000"
          tickStroke="#000"
        />
      </svg>
    </div>
  )
}

export default Legend
