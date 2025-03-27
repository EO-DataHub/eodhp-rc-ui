import { useEffect, useId, useRef, useState } from 'react'
import { scaleLinear } from '@visx/scale'
import { AxisBottom } from '@visx/axis'
import { Item } from '@/types'
import useColormap from '@/hooks/useColormap'

const HEIGHT = 50
const GRADIENT_HEIGHT = 20
const MARGIN = { top: 0, bottom: 0, left: 10, right: 10 }
const EPSILON_RATIO = 0.1 // 10% of the domain range on the legend

interface LegendProps {
  item: Item
}

const Legend = ({ item }: LegendProps) => {
  const legendId = useId()

  const colormap_name = item?.render?.colormap_name
  const rescale = item?.render?.rescale?.[0] ?? null
  const { data: colormap } = useColormap(colormap_name)

  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1)

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
  }, [colormap])

  if (!colormap || width === 0) return null

  const domain = Object.keys(colormap)
    .map(Number)
    .sort((a, b) => a - b)
  const range = domain.map((d) => colormap[d])
  const innerWidth = width - MARGIN.left - MARGIN.right

  // 💡 Use rescale values as physical domain if present
  const physicalDomain = rescale ?? null
  const physicalScale = physicalDomain
    ? scaleLinear({
        domain: physicalDomain,
        range: [0, innerWidth],
      })
    : null

  const tickCount = 6

  const physicalTicks =
    physicalScale && physicalDomain
      ? [
          physicalDomain[0],
          ...physicalScale.ticks(tickCount).filter((t) => {
            const epsilon = (physicalDomain[1] - physicalDomain[0]) * EPSILON_RATIO
            return (
              Math.abs(t - physicalDomain[0]) > epsilon && Math.abs(t - physicalDomain[1]) > epsilon
            )
          }),
          physicalDomain[1],
        ]
      : undefined

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={HEIGHT}>
        <defs>
          <linearGradient id={legendId} x1="0%" y1="0%" x2="100%" y2="0%">
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
          fill={`url(#${legendId})`}
          stroke="#000"
        />

        {physicalScale && (
          <AxisBottom
            top={GRADIENT_HEIGHT + 5}
            left={MARGIN.left}
            scale={physicalScale}
            tickValues={physicalTicks}
            tickFormat={(d) => Number(d).toString()}
            tickLabelProps={() => ({
              fill: '#000',
              fontSize: 10,
              textAnchor: 'middle',
            })}
            stroke="#000"
            tickStroke="#000"
          />
        )}
      </svg>
    </div>
  )
}

export default Legend
