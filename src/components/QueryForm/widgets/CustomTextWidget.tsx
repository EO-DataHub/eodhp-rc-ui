import { Flex, TextField, Text } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'

export const CustomTextWidget = ({ schema, value }: WidgetProps) => {
  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {schema.title ?? ''}
      </Text>
      <TextField.Root size="2" value={value ?? ''}></TextField.Root>
    </Flex>
  )
}
