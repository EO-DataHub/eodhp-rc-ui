import { Flex, Text, Slider } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'

export const CustomRangeWidget = ({ schema, value, onChange }: WidgetProps) => {
  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {schema.title ?? 'Select a range value'}
      </Text>
      <Flex justify="between">
        <Text size="2">{`${schema.minimum ?? 0}%`}</Text>
        <Text size="2">{`${schema.maximum ?? 100}%`}</Text>
      </Flex>
      <Slider
        value={[Number(value)]}
        min={0}
        max={100}
        step={1}
        onValueChange={(val) => onChange(val[0])}
      />
    </Flex>
  )
}
