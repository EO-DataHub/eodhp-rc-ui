import React from 'react'
import { Card, Flex, Heading, Spinner, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { fetchItems } from '@/services/processCatalogueService'
import { isDataFinderTool } from '@/services/notebookVariableResolvers'
import { Callout } from '@/components/Callout/Callout'
import type { Collection, ProcessRecord } from '@/types'
import { toolRunsOnOpenDataset } from '@/library/integrationTools'
import { ToolTypeBadge } from './ToolTypeBadge'
import styles from './RunPanel.module.scss'

// Fetches only the first page: up to 100 workflows and 100 notebooks
const fetchTools = async (type: 'workflow' | 'notebook') => {
  const { data, error } = await fetchItems({ type, page: 1, pageSize: 100 })
  if (error) throw new Error(error)
  return data?.items ?? []
}

const ToolEntry = ({ tool, onChoose }: { tool: ProcessRecord; onChoose: () => void }) => (
  <Card asChild variant="surface">
    <button type="button" className={styles.toolEntry} onClick={onChoose}>
      <Flex as="span" direction="column" gap="1">
        <Flex as="span" align="center" justify="between" gap="2">
          <Text size="2" weight="bold">
            {tool.properties.title}
          </Text>
          <ToolTypeBadge tool={tool} />
        </Flex>
        {tool.properties.description && (
          <Text size="1" color="gray">
            {tool.properties.description}
          </Text>
        )}
      </Flex>
    </button>
  </Card>
)

interface ToolListProps {
  collection?: Collection
  onChooseTool: (tool: ProcessRecord) => void
  headingRef?: React.Ref<HTMLHeadingElement>
}

/** Lists the workflows and item notebooks for the open dataset, then those for other datasets. */
export const ToolList: React.FC<ToolListProps> = ({ collection, onChooseTool, headingRef }) => {
  const workflows = useQuery({
    queryKey: ['DataFinderTools', 'workflow'],
    queryFn: () => fetchTools('workflow'),
  })
  const notebooks = useQuery({
    queryKey: ['DataFinderTools', 'notebook'],
    queryFn: () => fetchTools('notebook'),
  })

  // With no dataset open, every process is listed together
  const title = collection ? `Processes for ${collection.title ?? collection.id}` : 'All processes'
  const heading = (
    <Heading as="h2" size="4" tabIndex={-1} ref={headingRef}>
      {title}
    </Heading>
  )

  if (workflows.isPending || notebooks.isPending) {
    return (
      <Flex direction="column" gap="3">
        {heading}
        <Flex justify="center" p="4">
          <Spinner />
        </Flex>
      </Flex>
    )
  }

  const tools = [...(workflows.data ?? []), ...(notebooks.data ?? [])].filter(isDataFinderTool)
  const forThisDataset = tools.filter((tool) => toolRunsOnOpenDataset(tool, collection))
  const forOtherDatasets = tools.filter((tool) => !toolRunsOnOpenDataset(tool, collection))
  const error = workflows.error ?? notebooks.error

  const renderTools = (list: ProcessRecord[]) =>
    list.map((tool) => <ToolEntry key={tool.id} tool={tool} onChoose={() => onChooseTool(tool)} />)

  return (
    <Flex direction="column" gap="3">
      {heading}
      {error && <Callout type="error" message={error.message} />}
      {!error && tools.length === 0 && (
        <Callout type="info" message="No workflows or notebooks found." />
      )}
      {renderTools(forThisDataset)}
      {forOtherDatasets.length > 0 && (
        <>
          <Heading as="h3" size="3" mt="3">
            Processes for other datasets
          </Heading>
          {renderTools(forOtherDatasets)}
        </>
      )}
    </Flex>
  )
}
