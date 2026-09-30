import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Flex, Text, Tooltip } from '@radix-ui/themes'
import { BookmarkIcon, PlayIcon } from '@radix-ui/react-icons'
import type { Item } from '@/types'
import type { RunScope } from '../demoTypes'
import { useRunContext } from '../useRunContext'
import { RunWorkflowDialog } from './RunWorkflowDialog'
import { SaveSetDialog } from './SaveSetDialog'

/** "Run workflow" button for the Data Finder; opens the dialog on the given scope. */
export const RunWorkflowButton = ({
  scope,
  label = 'Run workflow',
  size = '2',
  variant = 'ghost',
}: {
  scope: RunScope
  label?: string
  size?: '1' | '2'
  variant?: 'ghost' | 'soft'
}) => {
  const [open, setOpen] = useState(false)
  const context = useRunContext({ inFinder: true })

  return (
    <>
      <Tooltip content="Demo: run a workflow on this data">
        <Flex width="fit-content" px={variant === 'ghost' ? '2' : '0'}>
          <Button variant={variant} size={size} onClick={() => setOpen(true)}>
            <PlayIcon width="16px" height="16px" />
            <Text>{label}</Text>
          </Button>
        </Flex>
      </Tooltip>
      <RunWorkflowDialog
        open={open}
        onOpenChange={setOpen}
        context={context}
        initialScope={scope}
      />
    </>
  )
}

/** "Save as set" button for the Pinned Items tab. */
export const SaveAsSetButton = ({ items }: { items: Item[] }) => {
  const [open, setOpen] = useState(false)
  const { workspace } = useRunContext({ inFinder: true })

  return (
    <>
      <Tooltip content="Demo: save these pinned items to your workspace">
        <Flex width="fit-content" px="2">
          <Button variant="ghost" size="2" onClick={() => setOpen(true)}>
            <BookmarkIcon width="16px" height="16px" />
            <Text>Save as set</Text>
          </Button>
        </Flex>
      </Tooltip>
      <SaveSetDialog open={open} onOpenChange={setOpen} items={items} workspace={workspace} />
    </>
  )
}

/** Opens the Run workflow dialog when the Data Finder is opened from a workflow share link. */
export const WorkflowShareLinkHandler = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const sharedWorkflowId = searchParams.get('runWorkflow') ?? undefined
  const [workflowId, setWorkflowId] = useState<string>()
  const context = useRunContext({ inFinder: true })

  useEffect(() => {
    if (!sharedWorkflowId) return
    setWorkflowId(sharedWorkflowId)
    const next = new URLSearchParams(searchParams)
    next.delete('runWorkflow')
    setSearchParams(next, { replace: true })
  }, [sharedWorkflowId, searchParams, setSearchParams])

  return (
    <RunWorkflowDialog
      open={!!workflowId}
      onOpenChange={(open) => !open && setWorkflowId(undefined)}
      context={context}
      initialWorkflowId={workflowId}
    />
  )
}
