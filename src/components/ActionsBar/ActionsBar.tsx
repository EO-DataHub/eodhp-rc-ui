import React from 'react'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Flex, Text, TextField } from '@radix-ui/themes'

export const ActionsBar: React.FC = () => {
  return (
    <Flex p="5" align="center" justify="between" width="100%">
      <Text size="6" weight="bold">
        Data Collections
      </Text>
      <TextField.Root placeholder="Search">
        <TextField.Slot>
          <MagnifyingGlassIcon />
        </TextField.Slot>
      </TextField.Root>
    </Flex>
  )
}
