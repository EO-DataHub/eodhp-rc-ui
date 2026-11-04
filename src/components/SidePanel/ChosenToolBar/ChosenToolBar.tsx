import React from 'react'
import { Callout, Flex, IconButton, Text } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

/** Shows the workflow or notebook the user has chosen to run, with a button to clear it. */
export const ChosenToolBar: React.FC = () => {
  const chosenTool = useSelector(dataFinderStore, (state) => state.context.chosenTool)

  if (!chosenTool) return null

  return (
    <Callout.Root size="1" variant="surface">
      <Flex align="center" justify="between" gap="2" width="100%">
        <Text size="2">
          Running <Text weight="bold">{chosenTool.properties.title}</Text> · pick your data
        </Text>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          aria-label="Clear chosen tool"
          onClick={() => dataFinderStore.send({ type: 'clearTool' })}
        >
          <Cross1Icon />
        </IconButton>
      </Flex>
    </Callout.Root>
  )
}
