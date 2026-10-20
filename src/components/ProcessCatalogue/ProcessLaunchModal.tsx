import React, { useContext, useEffect, useState } from 'react'
import { Dialog, Button, Flex, Text, Select, Checkbox } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import type { ProcessDetail } from '@/types'
import { useProcessLaunchFromCatalogue } from '@/hooks/useProcessLaunchFromCatalogue'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'
import { buildWorkflowVariables } from '@/services/workflowVariableResolvers'
import { getHubApiOrigin, getWorkflowExecutionUrl } from '@/library/integrationTools'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { launchWorkflow } from '@/services/workflowLaunchService'
import { launchNotebookInNewTab } from '@/hooks/useNotebookLaunch'

interface ProcessLaunchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  process: ProcessDetail
}

export const ProcessLaunchModal: React.FC<ProcessLaunchModalProps> = ({
  open,
  onOpenChange,
  process,
}) => {
  const { isAuthenticated, currentWorkspace, token, userInfo } = useContext(AuthenticationContext)
  const username = userInfo?.preferred_username

  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  const {
    collections,
    selectedCollectionUrl,
    selectedCollection,
    setSelectedCollectionUrl,
    items,
    selectedItem,
    setSelectedItemId,
    isLoadingItems,
    itemsError,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    dateRangeError,
    reset,
  } = useProcessLaunchFromCatalogue({ process })

  const [includeAoi, setIncludeAoi] = useState<boolean>(true)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  const processType = process.properties?.type ?? 'workflow'

  useEffect(() => {
    if (aoi) {
      setIncludeAoi(true)
    }
  }, [aoi])

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
      setLaunchError(null)
      setWorkflowId(null)
    }
    onOpenChange(nextOpen)
  }

  const canLaunchBase =
    isAuthenticated && !!currentWorkspace && !!token && !!username && !!selectedItem

  const handleWorkflowLaunch = async () => {
    if (!canLaunchBase || !selectedItem || !selectedCollection) return

    const executionUrl = getWorkflowExecutionUrl(process)
    if (!executionUrl) {
      setLaunchError('Workflow execution URL not found. Please contact support.')
      return
    }

    const inputParameters = process.properties?.inputParameters ?? {}
    const context = { item: selectedItem, aoi, includeAoi }
    const variables = buildWorkflowVariables(inputParameters, context)

    setIsLaunching(true)
    setLaunchError(null)
    setWorkflowId(null)

    try {
      const workspaceTokens = await fetchWorkspaceTokens(currentWorkspace, token)
      const workspaceToken = workspaceTokens.access

      const response = await launchWorkflow(executionUrl, variables, workspaceToken)
      const id = response.workflowId?.trim()
      setWorkflowId(id || null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to launch workflow. Please try again.'
      setLaunchError(message)
      setWorkflowId(null)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleNotebookLaunch = async () => {
    if (!canLaunchBase || !selectedItem) return

    setIsLaunching(true)
    setLaunchError(null)

    try {
      await launchNotebookInNewTab({
        loadNotebook: () => Promise.resolve(process),
        context: {
          item: selectedItem,
          aoi,
          includeAoi,
          workspace: currentWorkspace,
          apiBaseUrl: getHubApiOrigin(),
        },
        workspace: currentWorkspace,
        username,
        token,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to launch notebook. Please try again.'
      setLaunchError(message)
    } finally {
      setIsLaunching(false)
    }
  }

  const canLaunch = canLaunchBase && !isLoadingItems && !itemsError && !dateRangeError

  const showSuccessView = processType === 'workflow' && !!workflowId

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content maxWidth="520px">
        <Flex justify="between" align="center" mb="3">
          <Dialog.Title>
            {processType === 'notebook' ? 'Launch notebook' : 'Run workflow'}
          </Dialog.Title>
          <Dialog.Close>
            <Button variant="ghost" aria-label="Close">
              <Cross1Icon />
            </Button>
          </Dialog.Close>
        </Flex>

        {showSuccessView ? (
          <Flex direction="column" gap="3">
            <Text size="2" color="gray">
              The workflow has been sent. It may take a while to complete. You can view the job
              status and results using the button below, or from the Workflow outputs page in My
              Data.
            </Text>
            <Flex direction="column" gap="2">
              {currentWorkspace && workflowId ? (
                <Button
                  asChild
                  size="2"
                  onClick={() => handleClose(false)}
                  variant="solid"
                  color="blue"
                >
                  <a href={`#/my-data/workflow-outputs/${currentWorkspace}/${workflowId}`}>
                    View job details
                  </a>
                </Button>
              ) : (
                <Button asChild size="2" onClick={() => handleClose(false)} variant="solid">
                  <a href="#/my-data/workflow-outputs">View workflow outputs</a>
                </Button>
              )}
              <Button color="gray" variant="soft" onClick={() => handleClose(false)}>
                Close
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                {process.properties?.title ?? process.id}
              </Text>
              {process.properties?.description && (
                <Text size="2" color="gray">
                  {process.properties.description}
                </Text>
              )}
            </Flex>

            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Collection
                </Text>
                {collections.length === 0 ? (
                  <Text size="2" color="gray">
                    No applicable collections are configured for this process.
                  </Text>
                ) : (
                  <Select.Root
                    value={selectedCollectionUrl ?? ''}
                    onValueChange={(value) => setSelectedCollectionUrl(value || null)}
                  >
                    <Select.Trigger placeholder="Select collection" style={{ width: '100%' }} />
                    <Select.Content position="popper">
                      {collections.map((c) => (
                        <Select.Item key={c.id} value={c.url}>
                          {c.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </Flex>

              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Date range (optional)
                </Text>
                <Flex gap="2">
                  <input
                    type="date"
                    value={startDate ?? ''}
                    onChange={(e) => setStartDate(e.target.value || null)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--gray-7)',
                      fontSize: '14px',
                      flex: 1,
                    }}
                  />
                  <input
                    type="date"
                    value={endDate ?? ''}
                    onChange={(e) => setEndDate(e.target.value || null)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--gray-7)',
                      fontSize: '14px',
                      flex: 1,
                    }}
                  />
                </Flex>
                {dateRangeError && (
                  <Text size="2" color="red">
                    {dateRangeError}
                  </Text>
                )}
              </Flex>

              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Dataset
                </Text>
                {!selectedCollectionUrl ? (
                  <Text size="2" color="gray">
                    Select a collection first to see available datasets.
                  </Text>
                ) : isLoadingItems ? (
                  <Text size="2" color="gray">
                    Loading datasets…
                  </Text>
                ) : itemsError ? (
                  <Text size="2" color="red">
                    {itemsError}
                  </Text>
                ) : items.length === 0 ? (
                  <Text size="2" color="gray">
                    No datasets available for this collection.
                  </Text>
                ) : (
                  <Select.Root
                    value={selectedItem?.id ?? ''}
                    onValueChange={(value) => setSelectedItemId(value || null)}
                  >
                    <Select.Trigger placeholder="Select dataset" style={{ width: '100%' }} />
                    <Select.Content position="popper">
                      {items.map((item) => (
                        <Select.Item key={item.id} value={item.id}>
                          {item.id}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </Flex>

              {aoi && (
                <Flex align="center" gap="2">
                  <Checkbox
                    checked={includeAoi}
                    onCheckedChange={(checked) => setIncludeAoi(Boolean(checked))}
                    size="2"
                  />
                  <Text
                    size="2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setIncludeAoi(!includeAoi)}
                  >
                    Include Area of Interest (AOI)
                  </Text>
                </Flex>
              )}

              {launchError && (
                <Text size="2" color="red">
                  {launchError}
                </Text>
              )}
            </Flex>

            <Flex gap="2" justify="end">
              <Button color="gray" variant="soft" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                disabled={!canLaunch || isLaunching}
                onClick={() =>
                  processType === 'notebook'
                    ? void handleNotebookLaunch()
                    : void handleWorkflowLaunch()
                }
              >
                {isLaunching
                  ? processType === 'notebook'
                    ? 'Launching…'
                    : 'Running…'
                  : processType === 'notebook'
                    ? 'Launch notebook'
                    : 'Run workflow'}
              </Button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
