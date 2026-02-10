import React, { useState, useMemo, useContext } from 'react'
import { Cross1Icon, DownloadIcon, CopyIcon, CheckIcon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Button, Box, Card, Tabs, RadioGroup } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Collection, Item } from '@/types'
import { convertDateToUTCString } from '@/library/dateUtils'
import {
  downloadQlrForItem,
  getTitilerXyzUrl,
  supportsIntegrationTools,
} from '@/library/integrationTools'
import { toast } from 'react-toastify'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'
import { useNotebookLaunch } from '@/hooks/useNotebookLaunch'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { AuthenticationContext } from '@/context/AuthenticationContext'

interface IntegrationToolsPanelProps {
  item: Item | null
  onClose: () => void
}

// QGIS Tab Component
const QgisTab: React.FC<{ item: Item }> = ({ item }) => {
  const [isDownloading, setIsDownloading] = useState(false)
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

    setIsDownloading(true)
    try {
      await downloadQlrForItem(item, renderId)
      toast.success('QGIS layer file downloaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download QGIS layer file')
    } finally {
      setIsDownloading(false)
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
          <Button onClick={handleDownloadQlr} disabled={isDownloading} variant="soft" size="2">
            <DownloadIcon width="16" height="16" />
            {isDownloading ? 'Generating...' : 'Download QLR File'}
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
const WorkflowsTab: React.FC = () => {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Text weight="medium" size="3">
          Workflow Integration
        </Text>
        <Text size="2" color="gray">
          Start data processing workflows directly with this item. This feature will allow you to
          launch analysis pipelines, data processing jobs, and automated workflows.
        </Text>
        <Text size="2" color="orange">
          🚧 Coming Soon: Workflow integration will be available in a future update.
        </Text>
      </Flex>
    </Card>
  )
}

// Jupyter Tab Component
const JupyterTab: React.FC<{ item: Item; collection?: Collection }> = ({ item, collection }) => {
  const { isAuthenticated, currentWorkspace, token, userInfo } = useContext(AuthenticationContext)
  const username = userInfo?.preferred_username
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
    item,
    collection,
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
            <Tabs.Root defaultValue="qgis">
              <Tabs.List>
                <Tabs.Trigger value="qgis">QGIS</Tabs.Trigger>
                <Tabs.Trigger value="workflows">Workflows</Tabs.Trigger>
                <Tabs.Trigger value="jupyter">Jupyter</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="qgis">
                <Box pt="4">
                  <QgisTab item={item} />
                </Box>
              </Tabs.Content>

              <Tabs.Content value="workflows">
                <Box pt="4">
                  <WorkflowsTab />
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
