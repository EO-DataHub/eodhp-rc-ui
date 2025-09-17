import React, { useState } from 'react'
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

interface IntegrationToolsPanelProps {
  item: Item | null
  onClose: () => void
}

// QGIS Tab Component
const QgisTab: React.FC<{ item: Item }> = ({ item }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [xyzUrl, setXyzUrl] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Generate XYZ URL when component mounts
  React.useEffect(() => {
    if (item) {
      const url = getTitilerXyzUrl(item)
      setXyzUrl(url)
    }
  }, [item])

  const handleDownloadQlr = async () => {
    if (!item) return

    // Check if Titiler URL is available before attempting download
    const titilerUrl = getTitilerXyzUrl(item)
    if (!titilerUrl) {
      toast.error('Titiler URL not available for this item')
      return
    }

    setIsDownloading(true)
    try {
      await downloadQlrForItem(item)
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

  return (
    <Flex direction="column" gap="4">
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
  // Don't render if item doesn't support integration tools
  if (!item || !supportsIntegrationTools(item)) {
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
              {item.id} • {convertDateToUTCString(new Date(item.properties.datetime))}
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
