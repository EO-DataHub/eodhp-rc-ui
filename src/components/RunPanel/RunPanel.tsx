import React, { useEffect, useRef, useState } from 'react'
import { Badge, Box, Button, Flex, Heading, IconButton, Tabs, Text } from '@radix-ui/themes'
import { Cross1Icon, MixerHorizontalIcon } from '@radix-ui/react-icons'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import type { ProcessRecord } from '@/types'
import { ToolList } from './ToolList'
import { useRunPanelJobs } from '@/hooks/useRunPanelJobs'
import { WorkflowRunForm } from './WorkflowRunForm'
import { WorkflowOutputsTab } from './WorkflowOutputsTab'
import { NotebookLaunchForm } from './NotebookLaunchForm'
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

type PanelTab = 'tools' | 'outputs'

/** The Data Finder's panel for choosing and running a tool, docked on the right of the map. */
export const RunPanel: React.FC = () => {
  const isOpen = useSelector(dataFinderStore, (state) => state.context.isRunPanelOpen)
  const chosenTool = useSelector(dataFinderStore, (state) => state.context.chosenTool)
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const runSource = useSelector(dataFinderStore, (state) => state.context.runSource)
  const runItem = useSelector(dataFinderStore, (state) => state.context.runItem)
  const pinnedCount = useSelector(dataFinderStore, (state) => state.context.pinnedItems.length)
  const [tab, setTab] = useState<PanelTab>('tools')

  const { sharedQuery, userQuery, allJobs, sharedJobs, visitJobs, startedIds } = useRunPanelJobs(
    isOpen && tab === 'outputs',
  )
  const retryJobs = () => {
    void userQuery.refetch()
    if (sharedQuery.isError) void sharedQuery.refetch()
  }

  // The jobs started in this visit are forgotten on leaving the Data Finder
  useEffect(() => () => dataFinderStore.send({ type: 'clearVisitJobs' }), [])

  const headingRef = useRef<HTMLHeadingElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(isOpen)
  const shownToolRef = useRef(chosenTool?.id)

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

  // Choosing or clearing a tool replaces the focused button, so focus the new heading
  useEffect(() => {
    if (shownToolRef.current === chosenTool?.id) return
    shownToolRef.current = chosenTool?.id
    if (isOpen) headingRef.current?.focus()
  }, [chosenTool, isOpen])

  // A hidden panel keeps a workflow's form, so the run is as the user left it when it opens again
  const [hasOpened, setHasOpened] = useState(isOpen)
  if (isOpen && !hasOpened) setHasOpened(true)

  const chooseTool = (tool: ProcessRecord) => {
    dataFinderStore.send({ type: 'chooseTool', tool })
    // A tool for other datasets opens the dataset list, filtered to the datasets it runs on
    if (!toolAppliesTo(tool, collection)) {
      dataFinderStore.send({ type: 'requestDatasetList' })
    }
  }

  const isWorkflow = chosenTool?.properties.type === 'workflow'
  const open = () => dataFinderStore.send({ type: 'openRunPanel' })

  const badgeText = runPanelBadgeText({
    tool: chosenTool,
    source: runSource,
    item: runItem,
    pinnedCount,
    visitJobs,
    jobs: sharedJobs,
    startedIds,
  })

  return (
    <>
      {!isOpen && (
        <Box className={styles.openButton}>
          {badgeText ? (
            <Button ref={openButtonRef} variant="solid" onClick={open}>
              {badgeText}
            </Button>
          ) : (
            <Button ref={openButtonRef} variant="solid" onClick={open}>
              <MixerHorizontalIcon aria-hidden />
              Tools
            </Button>
          )}
        </Box>
      )}
      {(isOpen || (hasOpened && isWorkflow)) && (
        <aside aria-label="Tools" className={styles.panel} hidden={!isOpen}>
          <Tabs.Root
            value={tab}
            onValueChange={(value) => setTab(value as PanelTab)}
            className={styles.tabs}
          >
            <Flex align="center" justify="between" pr="3" className={styles.header}>
              <Tabs.List>
                {/* Radix Themes repeats a trigger's text inside it, so name each tab once */}
                <Tabs.Trigger value="tools" aria-label="Tools">
                  Tools
                </Tabs.Trigger>
                <Tabs.Trigger value="outputs" aria-label="Workflow outputs">
                  Workflow outputs
                </Tabs.Trigger>
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
                <Flex direction="column" gap="5">
                  <ChosenTool tool={chosenTool} headingRef={headingRef} />
                  {isWorkflow && (
                    <WorkflowRunForm
                      key={chosenTool.id}
                      tool={chosenTool}
                      onViewOutputs={() => setTab('outputs')}
                    />
                  )}
                  {chosenTool.properties.type === 'notebook' && (
                    <NotebookLaunchForm tool={chosenTool} />
                  )}
                </Flex>
              ) : (
                <ToolList
                  collection={collection}
                  onChooseTool={chooseTool}
                  headingRef={headingRef}
                />
              )}
            </Tabs.Content>
            <Tabs.Content value="outputs" className={styles.content}>
              <WorkflowOutputsTab
                jobs={allJobs}
                isLoading={userQuery.isLoading || sharedQuery.isLoading}
                error={userQuery.error ?? sharedQuery.error ?? undefined}
                onRetry={retryJobs}
                visitJobs={visitJobs}
                workflowId={isWorkflow ? chosenTool.id : undefined}
              />
            </Tabs.Content>
          </Tabs.Root>
        </aside>
      )}
    </>
  )
}
