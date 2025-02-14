import { Flex, Select, Text } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'

export const CustomSelectWidget = ({ schema, value, onChange }: WidgetProps) => {
  const rawOptions =
    schema.anyOf?.flatMap((option) =>
      option && typeof option === 'object' && 'enum' in option
        ? option.enum!.map((val) => ({ value: val, label: option.title ?? val }))
        : [],
    ) ?? []

  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {schema.title ?? 'Select an option'}
      </Text>
      <Select.Root size="2" value={value ?? ''} onValueChange={onChange}>
        <Select.Trigger placeholder="Select" />
        <Select.Content style={{ marginTop: '45px' }}>
          <Select.Group>
            {rawOptions.length ? (
              rawOptions.map((opt) => (
                <Select.Item key={opt.value?.toString()} value={opt.value?.toString() ?? ''}>
                  {opt.label?.toString()}
                </Select.Item>
              ))
            ) : (
              <Select.Item value="" disabled>
                No options available
              </Select.Item>
            )}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </Flex>
  )
}
