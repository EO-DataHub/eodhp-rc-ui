import React from 'react'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Flex, Text, TextField } from '@radix-ui/themes'

export const ActionsBar: React.FC = () => {
  return (
    <Flex p="5" align="center" justify="between" width="100%">
      <Text size="7" weight="medium">
        Data Collections
      </Text>
      <TextField.Root placeholder="Search" size="3">
        <TextField.Slot>
          <MagnifyingGlassIcon />
        </TextField.Slot>
      </TextField.Root>
    </Flex>
  )
}
