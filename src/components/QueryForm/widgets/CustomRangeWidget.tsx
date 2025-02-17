import { Flex, Text, Slider, Tooltip } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'
import { useState } from 'react'

export const CustomRangeWidget = ({ schema, value, onChange }: WidgetProps) => {
  const [sliderValue, setSliderValue] = useState<number>(Number(value) || 0)

  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {schema.title ?? 'Select a range value'}
      </Text>
      <Flex justify="between">
        <Text size="2">{`${schema.minimum ?? 0}%`}</Text>
        <Text size="2">{`${schema.maximum ?? 100}%`}</Text>
      </Flex>

      <Tooltip content={`${sliderValue}%`} side="top">
        <Slider
          value={[sliderValue]}
          min={schema.minimum ?? 0}
          max={schema.maximum ?? 100}
          step={1}
          onValueChange={(val) => {
            setSliderValue(val[0])
            onChange(val[0])
          }}
        />
      </Tooltip>
    </Flex>
  )
}
