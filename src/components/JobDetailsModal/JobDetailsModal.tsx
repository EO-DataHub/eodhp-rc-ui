import React, { useRef } from 'react'
import { Dialog, Button, Flex, Text, Box } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import { WorkflowJob } from '@/types'
import { formatOrderDate } from '@/library/orderUtils'
import styles from './JobDetailsModal.module.scss'

interface JobDetailsModalProps {
  job: WorkflowJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ job, open, onOpenChange }) => {
  const containerRef = useRef<HTMLDivElement>(null)

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
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.href}
                      </a>
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

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
