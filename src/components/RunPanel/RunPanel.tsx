import React, { useEffect, useRef } from 'react'
import { Badge, Box, Button, Flex, Heading, IconButton, Tabs, Text } from '@radix-ui/themes'
import { Cross1Icon, MixerHorizontalIcon } from '@radix-ui/react-icons'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import type { ProcessRecord } from '@/types'
import { ToolList } from './ToolList'
import { runPanelBadgeText, toolAppliesTo, toolTypeLabel } from './runPanelText'
import styles from './RunPanel.module.scss'

const ChosenTool = ({
  tool,
  headingRef,
}: {
  tool: ProcessRecord
  headingRef: React.Ref<HTMLHeadingElement>
}) => (
  <Flex direction="column" gap="2">
    <Flex align="start" justify="between" gap="2">
      <Flex direction="column" gap="1">
        <Heading as="h2" size="4" tabIndex={-1} ref={headingRef}>
          {tool.properties.title}
        </Heading>
        <Box>
          <Badge color={tool.properties.type === 'workflow' ? 'blue' : 'orange'}>
            {toolTypeLabel(tool)}
          </Badge>
        </Box>
      </Flex>
      <Button
        size="1"
        variant="soft"
        color="gray"
        onClick={() => dataFinderStore.send({ type: 'clearTool' })}
      >
        Clear tool
      </Button>
    </Flex>
    {tool.properties.description && (
      <Text size="2" color="gray">
        {tool.properties.description}
      </Text>
    )}
  </Flex>
)

/** The Data Finder's panel for choosing and running a tool, docked on the right of the map. */
export const RunPanel: React.FC = () => {
  const isOpen = useSelector(dataFinderStore, (state) => state.context.isRunPanelOpen)
  const chosenTool = useSelector(dataFinderStore, (state) => state.context.chosenTool)
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const runSource = useSelector(dataFinderStore, (state) => state.context.runSource)
  const runItem = useSelector(dataFinderStore, (state) => state.context.runItem)
  const pinnedCount = useSelector(dataFinderStore, (state) => state.context.pinnedItems.length)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(isOpen)

  // Move focus into the panel when it opens, and back to its button when it is hidden
  useEffect(() => {
    if (isOpen === wasOpenRef.current) return
    wasOpenRef.current = isOpen
    if (isOpen) {
      headingRef.current?.focus()
    } else {
      openButtonRef.current?.focus()
    }
  }, [isOpen])

  const chooseTool = (tool: ProcessRecord) => {
    dataFinderStore.send({ type: 'chooseTool', tool })
    // A tool for other datasets opens the dataset list, filtered to the datasets it runs on
    if (!toolAppliesTo(tool, collection)) {
      dataFinderStore.send({ type: 'requestDatasetList' })
    }
  }

  if (!isOpen) {
    const open = () => dataFinderStore.send({ type: 'openRunPanel' })
    return (
      <Box className={styles.openButton}>
        {chosenTool ? (
          <Button ref={openButtonRef} variant="solid" onClick={open}>
            {runPanelBadgeText({ tool: chosenTool, source: runSource, item: runItem, pinnedCount })}
          </Button>
        ) : (
          <Button ref={openButtonRef} variant="solid" onClick={open}>
            <MixerHorizontalIcon aria-hidden />
            Tools
          </Button>
        )}
      </Box>
    )
  }

  return (
    <aside aria-label="Tools" className={styles.panel}>
      <Tabs.Root defaultValue="tools" className={styles.tabs}>
        <Flex align="center" justify="between" pr="3" className={styles.header}>
          <Tabs.List>
            <Tabs.Trigger value="tools">Tools</Tabs.Trigger>
          </Tabs.List>
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            aria-label="Hide tools panel"
            onClick={() => dataFinderStore.send({ type: 'hideRunPanel' })}
          >
            <Cross1Icon />
          </IconButton>
        </Flex>
        <Tabs.Content value="tools" className={styles.content}>
          {chosenTool ? (
            <ChosenTool tool={chosenTool} headingRef={headingRef} />
          ) : (
            <ToolList collection={collection} onChooseTool={chooseTool} headingRef={headingRef} />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}
