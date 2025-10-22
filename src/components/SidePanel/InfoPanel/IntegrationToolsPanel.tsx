import React, { useState, useMemo } from 'react'
import { Cross1Icon, DownloadIcon, CopyIcon, CheckIcon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Button, Box, Card, Tabs } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'
import { convertDateToUTCString } from '@/library/dateUtils'
import {
  downloadQlrForItem,
  getTitilerXyzUrl,
  supportsIntegrationTools,
} from '@/library/integrationTools'
import { toast } from 'react-toastify'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'

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
const JupyterTab: React.FC = () => {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Text weight="medium" size="3">
          Jupyter Notebook Integration
        </Text>
        <Text size="2" color="gray">
          Launch Jupyter notebooks with this data already loaded and ready for analysis. Access
          pre-configured notebooks for common analysis tasks.
        </Text>
        <Text size="2" color="orange">
          🚧 Coming Soon: Jupyter notebook integration will be available in a future update.
        </Text>
      </Flex>
    </Card>
  )
}

// Main IntegrationToolsPanel Component
export const IntegrationToolsPanel: React.FC<IntegrationToolsPanelProps> = ({ item, onClose }) => {
  // Get the item's render if it exists (for pinned items or items with attached render)
  const itemRender = item?.render

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
                  <JupyterTab />
                </Box>
              </Tabs.Content>
            </Tabs.Root>
          </Box>
        </>
      )}
    </>
  )
}
