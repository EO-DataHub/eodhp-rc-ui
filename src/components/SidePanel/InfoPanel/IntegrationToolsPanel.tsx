import React, { useState, useMemo, useContext, useEffect } from 'react'
import { Cross1Icon, DownloadIcon, CopyIcon, CheckIcon } from '@radix-ui/react-icons'
import {
  Flex,
  Text,
  IconButton,
  Button,
  Box,
  Card,
  Tabs,
  RadioGroup,
  Checkbox,
} from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Collection, Item, ProcessRecord } from '@/types'
import { convertDateToUTCString } from '@/library/dateUtils'
import {
  downloadLyrxForItem,
  downloadQlrForItem,
  getTitilerXyzUrl,
  supportsIntegrationTools,
} from '@/library/integrationTools'
import { toast } from 'react-toastify'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'
import { useNotebookLaunch } from '@/hooks/useNotebookLaunch'
import { isPinSetNotebook } from '@/services/notebookVariableResolvers'
import { useWorkflowLaunch } from '@/hooks/useWorkflowLaunch'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { WorkflowLaunchModal } from '@/components/WorkflowLaunchModal/WorkflowLaunchModal'
import { AuthenticationContext } from '@/context/AuthenticationContext'

interface IntegrationToolsPanelProps {
  item: Item | null
  onClose: () => void
}

// Desktop GIS Tab Component (QGIS + ArcGIS Pro)
const DesktopGisTab: React.FC<{ item: Item }> = ({ item }) => {
  const [isDownloadingQlr, setIsDownloadingQlr] = useState(false)
  const [isDownloadingLyrx, setIsDownloadingLyrx] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Get the selected render from the store
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)
  const collectionRenderOptions = useSelector(
    dataFinderStore,
    ({ context }) => context.collectionRenderOptions,
  )

  // Prioritize the item's attached render (for time-variable items or pinned items)
  // Fall back to collection render if no item render is available
  const effectiveRender = item.render ?? collectionRender

  const xyzUrl = useMemo(() => {
    if (!item) return null

    // Use the item's render if available, otherwise fall back to collection render
    const renderId = effectiveRender?.id ?? collectionRenderOptions?.[0]?.id
    if (!renderId) return null

    return getTitilerXyzUrl(item, renderId)
  }, [item, effectiveRender, collectionRenderOptions])

  const handleDownloadQlr = async () => {
    if (!item) return

    // Use the effective render ID
    const renderId = effectiveRender?.id
    if (!renderId) {
      toast.error('No render configuration available for this item')
      return
    }

    // Check if Titiler URL is available before attempting download
    const titilerUrl = getTitilerXyzUrl(item, renderId)
    if (!titilerUrl) {
      toast.error('Titiler URL not available for this item')
      return
    }

    setIsDownloadingQlr(true)
    try {
      await downloadQlrForItem(item, renderId)
      toast.success('QGIS layer file downloaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download QGIS layer file')
    } finally {
      setIsDownloadingQlr(false)
    }
  }

  const handleDownloadLyrx = async () => {
    if (!item) return

    // Use the effective render ID
    const renderId = effectiveRender?.id
    if (!renderId) {
      toast.error('No render configuration available for this item')
      return
    }

    // Check if Titiler URL is available before attempting download
    const titilerUrl = getTitilerXyzUrl(item, renderId)
    if (!titilerUrl) {
      toast.error('Titiler URL not available for this item')
      return
    }

    setIsDownloadingLyrx(true)
    try {
      await downloadLyrxForItem(item, renderId)
      toast.success('ArcGIS Pro layer file downloaded successfully')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to download ArcGIS Pro layer file',
      )
    } finally {
      setIsDownloadingLyrx(false)
    }
  }

  const handleCopyXyzUrl = async () => {
    if (!xyzUrl) {
      toast.error('XYZ URL not available for this item')
      return
    }

    try {
      await navigator.clipboard.writeText(xyzUrl)
      setIsCopied(true)
      toast.success('XYZ URL copied to clipboard')

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy XYZ URL to clipboard')
    }
  }

  // Check if a valid render is available
  const hasValidRender = effectiveRender !== undefined
  const currentRenderTitle = effectiveRender?.title ?? 'Default'

  if (!hasValidRender) {
    return (
      <Flex direction="column" gap="4">
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Text weight="medium" size="3" color="red">
              No Render Configuration Available
            </Text>
            <Text size="2" color="gray">
              This item does not have a valid render configuration available for integration tools.
              Please contact the data provider for more information.
            </Text>
          </Flex>
        </Card>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="4">
      {/* Current Render Display */}
      <Card>
        <Flex direction="column" gap="2" p="4">
          <Text weight="medium" size="3">
            Current Render
          </Text>
          <Text size="2" color="gray">
            Using: <Text weight="medium">{currentRenderTitle}</Text>
          </Text>
        </Flex>
      </Card>

      {/* QGIS Layer Download */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <DownloadIcon width="20" height="20" />
            <Text weight="medium" size="3">
              QGIS Layer File
            </Text>
          </Flex>
          <Text size="2" color="gray">
            Download a QGIS layer file (.qlr) that can be directly loaded into QGIS for
            visualization and analysis.
          </Text>
          <Button onClick={handleDownloadQlr} disabled={isDownloadingQlr} variant="soft" size="2">
            <DownloadIcon width="16" height="16" />
            {isDownloadingQlr ? 'Generating...' : 'Download QLR File'}
          </Button>
        </Flex>
      </Card>

      {/* ArcGIS Pro Layer Download */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <DownloadIcon width="20" height="20" />
            <Text weight="medium" size="3">
              ArcGIS Pro Layer File
            </Text>
          </Flex>
          <Text size="2" color="gray">
            Download an ArcGIS Pro layer file (.lyrx) that can be directly loaded into ArcGIS Pro
            for visualization and analysis.
          </Text>
          <Button onClick={handleDownloadLyrx} disabled={isDownloadingLyrx} variant="soft" size="2">
            <DownloadIcon width="16" height="16" />
            {isDownloadingLyrx ? 'Generating...' : 'Download LYRX File'}
          </Button>
        </Flex>
      </Card>

      {/* XYZ Tile Service */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <CopyIcon width="20" height="20" />
            <Text weight="medium" size="3">
              XYZ Tile Service
            </Text>
          </Flex>
          <Text size="2" color="gray">
            Copy the XYZ tile service URL to use in GIS applications, web maps, or other mapping
            tools.
          </Text>

          {xyzUrl ? (
            <Flex direction="column" gap="2">
              <Box
                p="3"
                style={{
                  backgroundColor: 'var(--gray-2)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  wordBreak: 'break-all',
                }}
              >
                {xyzUrl}
              </Box>
              <Button
                onClick={handleCopyXyzUrl}
                variant="soft"
                size="2"
                color={isCopied ? 'green' : 'blue'}
              >
                {isCopied ? (
                  <>
                    <CheckIcon width="16" height="16" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon width="16" height="16" />
                    Copy XYZ URL
                  </>
                )}
              </Button>
            </Flex>
          ) : (
            <Text size="2" color="red">
              XYZ URL not available for this item
            </Text>
          )}
        </Flex>
      </Card>
    </Flex>
  )
}

// Workflows Tab Component
const WorkflowsTab: React.FC<{ item: Item; collection?: Collection }> = ({ item, collection }) => {
  const { isAuthenticated, currentWorkspace, token, userInfo } = useContext(AuthenticationContext)
  const username = userInfo?.preferred_username

  // Retrieve AOI from store
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)

  const {
    workflows,
    selectedWorkflow,
    setSelectedWorkflow,
    launch,
    isLoadingWorkflows,
    isLaunching,
    workflowsError,
    launchError,
    workflowId,
    clearWorkflowId,
    retry,
  } = useWorkflowLaunch({
    item,
    collection,
    token,
    currentWorkspace,
    username,
  })

  const canOpenLaunchModal = isAuthenticated && !!currentWorkspace && !!item && !!selectedWorkflow
  const showContent = isAuthenticated && !!currentWorkspace && !!item
  const hasWorkflows = workflows.length > 0
  const isEmpty = !isLoadingWorkflows && !workflowsError && workflows.length === 0

  const handleLaunchModalOpenChange = (open: boolean) => {
    setIsLaunchModalOpen(open)
    if (!open) clearWorkflowId()
  }

  if (!showContent) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text weight="medium" size="3">
            Workflow Integration
          </Text>
          <Text size="2" color="gray">
            Start data processing workflows directly with this item. Log in and select a workspace
            to use this feature.
          </Text>
        </Flex>
      </Card>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text weight="medium" size="3">
            Workflow Integration
          </Text>
          <Text size="2" color="gray">
            Start data processing workflows directly with this item. Select a workflow below and
            click Launch to configure and run it.
          </Text>

          {isLoadingWorkflows && (
            <Flex pt="4" pb="4">
              <LoadingIndicator size="2" />
            </Flex>
          )}

          {workflowsError && (
            <Flex direction="column" gap="2" pt="2">
              <Text size="2" color="red">
                Unable to load workflows
              </Text>
              <Text size="2" color="gray">
                {workflowsError}
              </Text>
              <Button variant="soft" size="2" onClick={retry}>
                Retry
              </Button>
            </Flex>
          )}

          {!isLoadingWorkflows && !workflowsError && (
            <>
              {isEmpty && (
                <Text size="2" color="gray">
                  No workflows available for this dataset
                </Text>
              )}

              {hasWorkflows && (
                <Flex direction="column" gap="3" pt="2">
                  <RadioGroup.Root
                    value={selectedWorkflow?.id ?? ''}
                    onValueChange={(id) => {
                      const wf = workflows.find((w) => w.id === id) ?? null
                      setSelectedWorkflow(wf)
                    }}
                  >
                    <Flex direction="column" gap="2">
                      {workflows.map((wf) => (
                        <label key={wf.id} style={{ cursor: 'pointer' }}>
                          <Flex gap="2" align="center">
                            <RadioGroup.Item value={wf.id} />
                            <Flex direction="column" gap="0">
                              <Text size="2" weight="medium">
                                {wf.properties?.title ?? wf.id}
                              </Text>
                              {wf.properties?.description && (
                                <Text size="1" color="gray">
                                  {wf.properties.description}
                                </Text>
                              )}
                            </Flex>
                          </Flex>
                        </label>
                      ))}
                    </Flex>
                  </RadioGroup.Root>

                  <Button
                    variant="soft"
                    size="2"
                    disabled={!canOpenLaunchModal}
                    onClick={() => setIsLaunchModalOpen(true)}
                  >
                    Launch
                  </Button>
                </Flex>
              )}
            </>
          )}
        </Flex>
      </Card>
      <WorkflowLaunchModal
        open={isLaunchModalOpen}
        onOpenChange={handleLaunchModalOpenChange}
        workflow={selectedWorkflow}
        item={item}
        aoi={aoi}
        launch={launch}
        isLaunching={isLaunching}
        launchError={launchError}
        workflowId={workflowId}
        currentWorkspace={currentWorkspace}
      />
    </Flex>
  )
}

// Set notebooks can't run on a single item.
const isItemNotebook = (record: ProcessRecord) => !isPinSetNotebook(record)

// Jupyter Tab Component
const JupyterTab: React.FC<{ item: Item; collection?: Collection }> = ({ item, collection }) => {
  const { isAuthenticated, currentWorkspace, token, userInfo } = useContext(AuthenticationContext)
  const username = userInfo?.preferred_username

  // Retrieve AOI from store
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  // State for checkbox - defaults to true when AOI exists
  const [includeAoi, setIncludeAoi] = useState(true)

  // Reset checkbox state when AOI changes
  useEffect(() => {
    setIncludeAoi(!!aoi)
  }, [aoi])

  const launchContext = useMemo(() => ({ item, aoi, includeAoi }), [item, aoi, includeAoi])

  const {
    notebooks,
    selectedNotebook,
    setSelectedNotebook,
    launch,
    isLoadingNotebooks,
    isLaunching,
    notebooksError,
    launchError,
    retry,
  } = useNotebookLaunch({
    enabled: !!collection?.id,
    applicableCollections: collection?.id,
    filterNotebooks: isItemNotebook,
    context: launchContext,
    token,
    currentWorkspace,
    username,
  })

  const canLaunch =
    isAuthenticated && !!currentWorkspace && !!item && !!selectedNotebook && !isLaunching
  const showContent = isAuthenticated && !!currentWorkspace && !!item
  const hasNotebooks = notebooks.length > 0
  const isEmpty = !isLoadingNotebooks && !notebooksError && notebooks.length === 0

  if (!showContent) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text weight="medium" size="3">
            Jupyter Notebook Integration
          </Text>
          <Text size="2" color="gray">
            Launch Jupyter notebooks with this data already loaded and ready for analysis. Log in
            and select a workspace to use this feature.
          </Text>
        </Flex>
      </Card>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text weight="medium" size="3">
            Jupyter Notebook Integration
          </Text>
          <Text size="2" color="gray">
            Launch Jupyter notebooks with this data already loaded and ready for analysis. Select a
            notebook below and click Launch.
          </Text>

          {isLoadingNotebooks && (
            <Flex pt="4" pb="4">
              <LoadingIndicator size="2" />
            </Flex>
          )}

          {notebooksError && (
            <Flex direction="column" gap="2" pt="2">
              <Text size="2" color="red">
                Unable to load notebooks
              </Text>
              <Text size="2" color="gray">
                {notebooksError}
              </Text>
              <Button variant="soft" size="2" onClick={retry}>
                Retry
              </Button>
            </Flex>
          )}

          {!isLoadingNotebooks && !notebooksError && (
            <>
              {isEmpty && (
                <Text size="2" color="gray">
                  No notebooks available for this dataset
                </Text>
              )}

              {hasNotebooks && (
                <Flex direction="column" gap="3" pt="2">
                  <RadioGroup.Root
                    value={selectedNotebook?.id ?? ''}
                    onValueChange={(id) => {
                      const nb = notebooks.find((n) => n.id === id) ?? null
                      setSelectedNotebook(nb)
                    }}
                  >
                    <Flex direction="column" gap="2">
                      {notebooks.map((nb) => (
                        <label key={nb.id} style={{ cursor: 'pointer' }}>
                          <Flex gap="2" align="center">
                            <RadioGroup.Item value={nb.id} />
                            <Flex direction="column" gap="0">
                              <Text size="2" weight="medium">
                                {nb.properties?.title ?? nb.id}
                              </Text>
                              {nb.properties?.description && (
                                <Text size="1" color="gray">
                                  {nb.properties.description}
                                </Text>
                              )}
                            </Flex>
                          </Flex>
                        </label>
                      ))}
                    </Flex>
                  </RadioGroup.Root>

                  {hasNotebooks && aoi && (
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

                  <Button
                    variant="soft"
                    size="2"
                    disabled={!canLaunch}
                    onClick={() => void launch()}
                  >
                    {isLaunching ? 'Launching...' : 'Launch'}
                  </Button>

                  {launchError && (
                    <Flex direction="column" gap="2">
                      <Text size="2" color="red">
                        {launchError}
                      </Text>
                      <Button variant="soft" size="2" color="red" onClick={() => void launch()}>
                        Retry
                      </Button>
                    </Flex>
                  )}
                </Flex>
              )}
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  )
}

// Main IntegrationToolsPanel Component
export const IntegrationToolsPanel: React.FC<IntegrationToolsPanelProps> = ({ item, onClose }) => {
  // Get the item's render if it exists (for pinned items or items with attached render)
  const itemRender = item?.render
  const collection = useSelector(dataFinderStore, ({ context }) => context.collection)

  // Don't render if item doesn't support integration tools
  // For time-variable items, this will check if itemRender is valid
  if (!item || !supportsIntegrationTools(item, itemRender)) {
    return null
  }

  return (
    <>
      {item && (
        <>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text weight="medium" size="5" className={styles.title} title={item.id}>
                Integration Tools
              </Text>
              <Flex direction="row" gap="5" justify="start">
                <IconButton variant="ghost" onClick={onClose}>
                  <Cross1Icon width="20" height="20" color="#60646C" />
                </IconButton>
              </Flex>
            </Flex>
            <Text size="3" className={styles.subtitle}>
              {item.id} •{' '}
              {item.properties.datetime
                ? convertDateToUTCString(new Date(item.properties.datetime))
                : 'N/A'}
            </Text>
          </Flex>

          <Box pt="6">
            <Tabs.Root defaultValue="desktop-gis">
              <Tabs.List>
                <Tabs.Trigger value="desktop-gis">Desktop GIS</Tabs.Trigger>
                <Tabs.Trigger value="workflows">Workflows</Tabs.Trigger>
                <Tabs.Trigger value="jupyter">Jupyter</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="desktop-gis">
                <Box pt="4">
                  <DesktopGisTab item={item} />
                </Box>
              </Tabs.Content>

              <Tabs.Content value="workflows">
                <Box pt="4">
                  <WorkflowsTab item={item} collection={item.collectionRef ?? collection} />
                </Box>
              </Tabs.Content>

              <Tabs.Content value="jupyter">
                <Box pt="4">
                  <JupyterTab item={item} collection={item.collectionRef ?? collection} />
                </Box>
              </Tabs.Content>
            </Tabs.Root>
          </Box>
        </>
      )}
    </>
  )
}
