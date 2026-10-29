import { Badge, Card, Flex, Spinner, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { fetchItems } from '@/services/processCatalogueService'
import { isPinSetNotebook } from '@/services/notebookVariableResolvers'
import { Callout } from '@/components/Callout/Callout'
import type { ProcessRecord } from '@/types'
import listStyles from '../ItemList.module.scss'

const fetchTools = async (type: 'workflow' | 'notebook') => {
  const { data, error } = await fetchItems({ type, page: 1, pageSize: 100 })
  if (error) throw new Error(error)
  return data?.items ?? []
}

interface ToolsTabProps {
  onChooseTool: (tool: ProcessRecord) => void
}

/** Lists the workflows and item notebooks the user can choose to run on Data Finder items. */
const ToolsTab = ({ onChooseTool }: ToolsTabProps) => {
  const chosenToolId = useSelector(dataFinderStore, (state) => state.context.chosenTool?.id)

  const workflows = useQuery({
    queryKey: ['DataFinderTools', 'workflow'],
    queryFn: () => fetchTools('workflow'),
  })
  const notebooks = useQuery({
    queryKey: ['DataFinderTools', 'notebook'],
    queryFn: () => fetchTools('notebook'),
  })

  if (workflows.isPending || notebooks.isPending) {
    return (
      <Flex justify="center" p="4">
        <Spinner />
      </Flex>
    )
  }

  // Set notebooks need a saved set, not a single item
  const tools = [
    ...(workflows.data ?? []),
    ...(notebooks.data ?? []).filter((notebook) => !isPinSetNotebook(notebook)),
  ]
  const error = workflows.error ?? notebooks.error

  return (
    <Flex direction="column" gap="3" pt="3" className={listStyles.listContainer}>
      {error && <Callout type="error" message={error.message} />}
      {!error && tools.length === 0 && (
        <Callout type="info" message="No workflows or notebooks found." />
      )}
      {tools.map((tool) => {
        const isChosen = tool.id === chosenToolId
        return (
          <Card key={tool.id} asChild variant={isChosen ? 'classic' : 'surface'}>
            <button
              type="button"
              aria-pressed={isChosen}
              onClick={() => onChooseTool(tool)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                outline: isChosen ? '2px solid var(--accent-9)' : undefined,
              }}
            >
              <Flex direction="column" gap="1">
                <Flex align="center" justify="between" gap="2">
                  <Text size="2" weight="bold">
                    {tool.properties.title}
                  </Text>
                  <Badge color={tool.properties.type === 'workflow' ? 'blue' : 'orange'}>
                    {tool.properties.type === 'workflow' ? 'Workflow' : 'Notebook'}
                  </Badge>
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
      })}
    </Flex>
  )
}

export default ToolsTab
