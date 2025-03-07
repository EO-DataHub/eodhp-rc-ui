import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Flex, Text, Slider } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'
import styles from './CustomRangeWidget.module.scss'

export const CustomRangeWidget = ({ schema, value, onChange }: WidgetProps) => {
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const [showTooltip, setShowTooltip] = useState<boolean>(false)
  const sliderValue = value ?? schema.default ?? schema.minimum ?? 0
  const sliderRef = useRef<HTMLDivElement>(null)

  // since Radix doesn’t offer a dynamic tooltip for elements like the slider,
  // we need to create one ourselves based on the slider's position
  const updateTooltipPosition = (val: number) => {
    if (!sliderRef.current) return

    const slider = sliderRef.current
    const sliderRect = slider.getBoundingClientRect()
    const min = schema.minimum ?? 0
    const max = schema.maximum ?? 100

    const percent = ((val - min) / (max - min)) * 100
    let newLeft = sliderRect.left + (percent / 100) * sliderRect.width
    const newTop = sliderRect.top - 40

    const tooltipWidth = 15
    newLeft = Math.max(tooltipWidth / 2, Math.min(newLeft, window.innerWidth - tooltipWidth / 2))
    setTooltipPos({ left: newLeft, top: newTop })
  }

  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {schema.title ?? 'Select a range value'}
      </Text>
      <Flex justify="between">
        <Text size="2">{`${schema.minimum ?? 0}%`}</Text>
        <Text size="2">{`${schema.maximum ?? 100}%`}</Text>
      </Flex>

      <div
        className={styles.slider}
        ref={sliderRef}
        onPointerEnter={() => {
          updateTooltipPosition(sliderValue)
          setShowTooltip(true)
        }}
        onPointerLeave={() => setShowTooltip(false)}
      >
        {showTooltip &&
          createPortal(
            <div
              className={styles.tooltip}
              style={{ left: `${tooltipPos.left}px`, top: `${tooltipPos.top}px` }}
            >
              {sliderValue}%
            </div>,
            document.body,
          )}

        <Slider
          value={[sliderValue]}
          min={schema.minimum ?? 0}
          max={schema.maximum ?? 100}
          step={1}
          onValueChange={(val) => {
            updateTooltipPosition(val[0])
            onChange(val[0])
            setShowTooltip(true)
          }}
          onPointerDown={() => setShowTooltip(true)}
          onPointerUp={() => setShowTooltip(false)}
        />
      </div>
    </Flex>
  )
}
