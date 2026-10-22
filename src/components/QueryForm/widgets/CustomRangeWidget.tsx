import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Flex, Text, Slider } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'
import { getRangeLabel, getRangeLimit } from '@/library/rangeLabel'
import styles from './CustomRangeWidget.module.scss'

export const CustomRangeWidget = ({ schema, value, onChange }: WidgetProps) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const min = schema.minimum ?? 0
  const max = schema.maximum ?? 100
  const limit = getRangeLimit(schema.operator)
  const isInverted = limit === 'min'

  const calculateActualValue = useCallback(
    (val: number) => (isInverted ? max + min - val : val),
    [isInverted, min, max],
  )

  const [sliderValue, setSliderValue] = useState<number>(value ?? schema.default ?? min)
  const [actualSliderValue, setActualSliderValue] = useState<number>(
    calculateActualValue(value ?? schema.default ?? min),
  )

  // Update state only on external reset (`value` changes by default)
  useEffect(() => {
    if (value === schema.default) {
      setSliderValue(value)
      setActualSliderValue(calculateActualValue(value))
    }
  }, [value, schema.default, calculateActualValue])

  // since Radix doesn’t offer a dynamic tooltip for elements like the slider,
  // we need to create one ourselves based on the slider's position
  const updateTooltipPosition = (val: number) => {
    if (!sliderRef.current) return

    const slider = sliderRef.current
    const sliderRect = slider.getBoundingClientRect()

    const percent = (val - min) / (max - min)
    let newLeft = sliderRect.left + percent * sliderRect.width
    const newTop = sliderRect.top - 40

    const tooltipWidth = 15
    newLeft = Math.max(tooltipWidth / 2, Math.min(newLeft, window.innerWidth - tooltipWidth / 2))
    setTooltipPos({ left: newLeft, top: newTop })
  }

  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {getRangeLabel(schema.title, limit)}
      </Text>
      <Flex justify="between">
        <Text size="2">{`${min}${schema.units ?? '%'}`}</Text>
        <Text size="2">{`${max}${schema.units ?? '%'}`}</Text>
      </Flex>

      <div
        className={styles.slider}
        ref={sliderRef}
        onPointerEnter={() => {
          updateTooltipPosition(actualSliderValue)
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
              {actualSliderValue}
              {schema.units ?? '%'}
            </div>,
            document.body,
          )}

        <Slider
          value={[sliderValue]}
          min={min}
          max={max}
          inverted={isInverted}
          step={1}
          onValueChange={(val) => {
            const adjustedValue = calculateActualValue(val[0])
            updateTooltipPosition(adjustedValue)
            setActualSliderValue(adjustedValue)
            setSliderValue(val[0])
            onChange(adjustedValue)
            setShowTooltip(true)
          }}
          onPointerDown={() => setShowTooltip(true)}
          onPointerUp={() => setShowTooltip(false)}
        />
      </div>
    </Flex>
  )
}
