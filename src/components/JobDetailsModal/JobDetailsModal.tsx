import React, { useRef } from 'react'
import { Dialog, Button, Flex, Text, Box } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import { WorkflowJob } from '@/types'
import { formatOrderDate } from '@/library/orderUtils'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { useWorkflowJobDetails } from '@/hooks/useWorkflowJobDetails'
import styles from './JobDetailsModal.module.scss'

interface JobDetailsModalProps {
  job: WorkflowJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceName?: string
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  open,
  onOpenChange,
  workspaceName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    isLoadingWorkspaceToken,
    workspaceTokenError,
    resultsLink,
    resultsData,
    isLoadingResults,
    resultsError,
    resultsBlockedByWorkspaceContext,
    firstItemLink,
    resultItem,
    isLoadingItem,
    itemError,
    logLinks,
    selectedLog,
    logContent,
    isLoadingLog,
    logError,
    assetError,
    handleViewLog,
    handleDownloadAsset,
  } = useWorkflowJobDetails({ job, workspaceName })

  if (!job) return null

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'N/A'
    try {
      return formatOrderDate(timestamp)
    } catch {
      return timestamp
    }
  }

  const getStatusColor = (status: string): 'green' | 'red' | 'orange' => {
    switch (status) {
      case 'successful':
        return 'green'
      case 'failed':
        return 'red'
      case 'running':
        return 'orange'
      default:
        return 'green'
    }
  }

  const getLinkLabel = (rel: string, title?: string): string => {
    if (rel === 'monitor') return 'Status'
    if (rel === 'http://www.opengis.net/def/rel/ogc/1.0/results') return 'Results'
    return title ?? 'Link'
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="800px"
        className={styles.dialogContent}
        ref={containerRef}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          containerRef.current?.setAttribute('tabindex', '-1')
          containerRef.current?.focus()
        }}
      >
        <Dialog.Close>
          <Button variant="ghost" aria-label="Close" className={styles.closeButton} tabIndex={0}>
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="column" gap="4" className={styles.flexContainer}>
          <Dialog.Title className={styles.dialogTitle}>Workflow Job Details</Dialog.Title>

          {/* Job ID */}
          <Flex direction="row" gap="2" align="baseline">
            <Text size="2" weight="bold">
              Job ID
            </Text>
            <Text size="2" style={{ fontFamily: 'monospace' }}>
              {job.id}
            </Text>
          </Flex>

          {/* Process ID */}
          <Flex direction="row" gap="2" align="baseline">
            <Text size="2" weight="bold">
              Process ID
            </Text>
            <Text size="2">{job.processID}</Text>
          </Flex>

          {/* Status */}
          <Flex direction="row" gap="2" align="baseline">
            <Text size="2" weight="bold">
              Status
            </Text>
            <Text size="2" color={getStatusColor(job.status)}>
              {job.status}
            </Text>
          </Flex>

          {/* Timestamps */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              Timestamps
            </Text>
            <Box pl="3">
              <Text size="2" color="gray">
                Created: {formatTimestamp(job.created)}
              </Text>
            </Box>
            <Box pl="3">
              <Text size="2" color="gray">
                Started: {formatTimestamp(job.started)}
              </Text>
            </Box>
            {job.finished && (
              <Box pl="3">
                <Text size="2" color="gray">
                  Finished: {formatTimestamp(job.finished)}
                </Text>
              </Box>
            )}
            <Box pl="3">
              <Text size="2" color="gray">
                Updated: {formatTimestamp(job.updated)}
              </Text>
            </Box>
          </Flex>

          {/* Message */}
          <Flex direction="row" gap="2" align="baseline" wrap="wrap">
            <Text size="2" weight="bold">
              Message
            </Text>
            <Text
              size="2"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {job.message}
            </Text>
          </Flex>

          {/* Links */}
          {job.links && job.links.length > 0 && (
            <Box>
              <Text size="2" weight="bold" mb="2">
                Links
              </Text>
              <Flex direction="column" gap="2">
                {job.links.map((link, index) => (
                  <Flex key={index} direction="row" gap="2" align="baseline" wrap="wrap">
                    <Text size="2" weight="medium">
                      {link.title ?? getLinkLabel(link.rel, link.title)}
                    </Text>
                    <Text size="1" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {link.href}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

          {/* Results */}
          <Box>
            <Text size="2" weight="bold" mb="2">
              Results
            </Text>
            {!resultsLink && (
              <Text size="2" color="gray">
                No results link is available for this job yet.
              </Text>
            )}
            {resultsLink && resultsBlockedByWorkspaceContext && (
              <Text size="2" color="gray">
                Select a workspace to view results.
              </Text>
            )}
            {resultsLink &&
              !resultsBlockedByWorkspaceContext &&
              (isLoadingWorkspaceToken || isLoadingResults) && <LoadingIndicator size="2" />}
            {resultsLink &&
              !resultsBlockedByWorkspaceContext &&
              !isLoadingWorkspaceToken &&
              workspaceTokenError instanceof Error && (
                <Callout
                  type="error"
                  message={
                    workspaceTokenError.message ??
                    'Unable to obtain workspace-scoped token. Please check your workspace access.'
                  }
                />
              )}
            {resultsLink &&
              !resultsBlockedByWorkspaceContext &&
              !isLoadingWorkspaceToken &&
              resultsError instanceof Error && (
                <Callout
                  type="error"
                  message={
                    resultsError.message ?? 'Unable to load job results. Please try again later.'
                  }
                />
              )}
            {resultsLink &&
              !resultsBlockedByWorkspaceContext &&
              !isLoadingWorkspaceToken &&
              !isLoadingResults &&
              !resultsError &&
              resultsData == null && (
                <Text size="2" color="gray">
                  Results are not available for this job.
                </Text>
              )}
            {resultsLink &&
              !isLoadingWorkspaceToken &&
              !isLoadingResults &&
              !resultsError &&
              resultsData != null && (
                <Flex direction="column" gap="3">
                  <Box>
                    <Text size="2" weight="medium" mb="1">
                      Result collection (raw payload)
                    </Text>
                    <Box
                      mt="2"
                      px="3"
                      py="2"
                      style={{
                        backgroundColor: 'var(--gray-2)',
                        borderRadius: 6,
                        maxHeight: 260,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      <pre style={{ margin: 0 }}>
                        {typeof resultsData === 'object'
                          ? JSON.stringify(resultsData, null, 2)
                          : String(resultsData).slice(0, 10000)}
                      </pre>
                    </Box>
                  </Box>

                  <Box>
                    <Text size="2" weight="medium">
                      Result item assets
                    </Text>
                    {!firstItemLink && (
                      <Text size="2" color="gray" mt="1">
                        No item link is available in the results collection.
                      </Text>
                    )}
                    {firstItemLink && isLoadingItem && (
                      <Box mt="2">
                        <LoadingIndicator size="2" />
                      </Box>
                    )}
                    {firstItemLink && itemError instanceof Error && (
                      <Box mt="2">
                        <Callout
                          type="error"
                          message={
                            itemError.message ??
                            'Unable to load result item from collection. Please try again later.'
                          }
                        />
                      </Box>
                    )}
                    {firstItemLink && !isLoadingItem && !itemError && resultItem && (
                      <Box mt="2">
                        <Text size="2" weight="bold">
                          Item ID:
                        </Text>{' '}
                        <Text size="2" style={{ fontFamily: 'monospace' }}>
                          {resultItem.id}
                        </Text>
                        <Box mt="2">
                          {Object.entries(resultItem.assets ?? {}).length === 0 && (
                            <Text size="2" color="gray">
                              This item does not expose any assets.
                            </Text>
                          )}
                          {Object.entries(resultItem.assets ?? {}).length > 0 && (
                            <Flex direction="column" gap="2">
                              {Object.entries(resultItem.assets).map(([key, asset]) => (
                                <Flex key={key} direction="row" gap="3" align="center" wrap="wrap">
                                  <Text size="2" weight="medium">
                                    {key}
                                  </Text>
                                  <Text
                                    size="1"
                                    color="gray"
                                    style={{
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {asset.href}
                                  </Text>
                                  <Button
                                    size="1"
                                    variant="soft"
                                    color="gray"
                                    onClick={() => void handleDownloadAsset(asset.href)}
                                  >
                                    Download
                                  </Button>
                                </Flex>
                              ))}
                            </Flex>
                          )}
                          {assetError && (
                            <Box mt="2">
                              <Callout
                                type="error"
                                message={
                                  assetError.message ??
                                  'Unable to download asset. Please try again later.'
                                }
                              />
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Flex>
              )}
          </Box>

          {/* Logs */}
          <Box>
            <Text size="2" weight="bold" mb="2">
              Logs
            </Text>
            {!logLinks.length && (
              <Text size="2" color="gray">
                No logs are exposed for this job.
              </Text>
            )}
            {!!logLinks.length && (
              <Flex direction="column" gap="3">
                <Flex direction="column" gap="2">
                  {logLinks.map((link) => (
                    <Flex key={link.href} direction="row" gap="3" align="center" wrap="wrap">
                      <Text size="2" weight="medium">
                        {link.title ?? link.rel ?? 'Log'}
                      </Text>
                      <Text
                        size="1"
                        color="gray"
                        style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        {link.href}
                      </Text>
                      <Button
                        size="1"
                        variant="soft"
                        color="gray"
                        onClick={() => void handleViewLog(link)}
                      >
                        View log
                      </Button>
                    </Flex>
                  ))}
                </Flex>

                <Box
                  mt="2"
                  px="3"
                  py="2"
                  style={{
                    backgroundColor: 'var(--gray-2)',
                    borderRadius: 6,
                    maxHeight: 260,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  {isLoadingLog && <LoadingIndicator size="1" />}
                  {!isLoadingLog && logError && (
                    <Callout
                      type="error"
                      message={
                        logError.message ?? 'Unable to load log content. Please try again later.'
                      }
                    />
                  )}
                  {!isLoadingLog && !logError && selectedLog && (
                    <>
                      <Text size="2" weight="medium">
                        {selectedLog.title ?? selectedLog.rel ?? 'Selected log'}
                      </Text>
                      <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{logContent}</pre>
                    </>
                  )}
                  {!isLoadingLog && !logError && !selectedLog && (
                    <Text size="2" color="gray">
                      Select a log above to view its content.
                    </Text>
                  )}
                </Box>
              </Flex>
            )}
          </Box>

          {/* Close Button */}
          <Flex justify="end" mt="4">
            <Button onClick={() => onOpenChange(false)} color="gray" variant="soft">
              Close
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
