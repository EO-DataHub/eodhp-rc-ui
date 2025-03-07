import React from 'react'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Flex, Text, TextField } from '@radix-ui/themes'

interface ActionBarProps {
  searchText: string
  onSearch: (value: string) => void
}

export const ActionsBar: React.FC<ActionBarProps> = ({ searchText, onSearch }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value)
  }

  return (
    <Flex p="5" align="center" justify="between" width="100%">
      <Text size="7" weight="medium">
        Data Collections
      </Text>
      <TextField.Root placeholder="Search" value={searchText} onChange={handleChange} size="3">
        <TextField.Slot>
          <MagnifyingGlassIcon />
        </TextField.Slot>
      </TextField.Root>
    </Flex>
  )
}
