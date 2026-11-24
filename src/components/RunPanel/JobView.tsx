import React, { useState } from 'react'
import { Badge, Box, Button, Flex, Heading, Text } from '@radix-ui/themes'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import type { Item, WorkflowJob } from '@/types'
import { useWorkflowJobDetails } from '@/hooks/useWorkflowJobDetails'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { JobDetailsModal } from '@/components/JobDetailsModal/JobDetailsModal'
import type { JobRow } from '@/library/runPanelJobs'
import styles from './RunPanel.module.scss'

const STATUS_COLORS: Record<WorkflowJob['status'], 'blue' | 'green' | 'red'> = {
  running: 'blue',
  successful: 'green',
  failed: 'red',
}

export const JobStatus = ({ status }: { status?: WorkflowJob['status'] }) =>
  status ? (
    <Badge color={STATUS_COLORS[status]}>{status}</Badge>
  ) : (
    <Badge color="gray">starting</Badge>
  )

interface ResultAsset {
  key: string
  href: string
  title?: string
  type?: string
  roles?: string[]
}

const isDataAsset = ({ roles, type }: ResultAsset) =>
  !!roles?.includes('data') || /geotiff|cloud-optimized/i.test(type ?? '')

/** A result item's assets, data files first. */
const itemAssets = (item: Item): ResultAsset[] => {
  const assets = Object.entries(item.assets ?? {}).map(
    ([key, asset]) => ({ key, ...(asset as Omit<ResultAsset, 'key'>) }) as ResultAsset,
  )
  return [...assets.filter(isDataAsset), ...assets.filter((asset) => !isDataAsset(asset))]
}

const AssetList = ({ item, onDownload }: { item: Item; onDownload: (href: string) => void }) => (
  <ul className={styles.jobList}>
    {itemAssets(item).map((asset) => (
      <li key={asset.key} className={styles.jobRow}>
        <Flex justify="between" align="center" gap="2">
          <Text size="2">{asset.title ?? asset.key}</Text>
          <Button size="1" variant="soft" onClick={() => onDownload(asset.href)}>
            Download
          </Button>
        </Flex>
      </li>
    ))}
  </ul>
)

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })

/** "Started 14:02 · took 3 min", or "running for 3 min" while the job runs. */
const runTimeText = (started: string, finished: string | null | undefined) => {
  const start = new Date(started)
  const end = finished ? new Date(finished) : new Date()
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
  return `Started ${formatTime(start)} · ${finished ? 'took' : 'running for'} ${minutes} min`
}

/**
 * A job's status and outputs in the Workflow outputs tab. The links, IDs and logs are in the job
 * details modal, behind Technical details.
 */
export const JobView: React.FC<{ row: JobRow; job?: WorkflowJob; onBack: () => void }> = ({
  row,
  job,
  onBack,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const details = useWorkflowJobDetails({
    job: job?.status === 'successful' ? job : null,
    allItems: true,
  })

  const outputs = () => {
    if (!job || job.status === 'running') {
      return (
        <Text size="2" color="gray">
          Outputs appear here when the job finishes.
        </Text>
      )
    }
    if (job.status === 'failed') {
      return <Callout type="error" message={job.message || 'The job failed.'} />
    }
    const error =
      details.workspaceTokenError ??
      details.resultsError ??
      details.itemsError ??
      details.assetError
    const { resultItems } = details
    return (
      <Flex direction="column" gap="3">
        {error instanceof Error && <Callout type="error" message={error.message} />}
        {(details.isLoadingWorkspaceToken ||
          details.isLoadingResults ||
          details.isLoadingItems) && <LoadingIndicator size="2" />}
        {resultItems.length === 1 && (
          <AssetList item={resultItems[0]} onDownload={details.handleDownloadAsset} />
        )}
        {resultItems.length > 1 &&
          resultItems.map((item) => (
            <Flex key={item.id} direction="column" gap="1">
              <Heading as="h4" size="2" className={styles.jobItem}>
                {item.id}
              </Heading>
              <AssetList item={item} onDownload={details.handleDownloadAsset} />
            </Flex>
          ))}
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <Box>
        <Button variant="ghost" size="1" onClick={onBack}>
          <ArrowLeftIcon aria-hidden />
          Back
        </Button>
      </Box>
      <Flex direction="column" gap="1">
        <Flex justify="between" align="center" gap="2">
          <Heading as="h3" size="3">
            {row.workflowTitle}
          </Heading>
          <JobStatus status={row.status} />
        </Flex>
        {row.itemId && (
          <Text size="1" className={styles.jobItem}>
            {row.itemId}
          </Text>
        )}
        <Text size="1" color="gray">
          {runTimeText(job?.started ?? row.created, job?.finished)}
        </Text>
      </Flex>
      {outputs()}
      {job && (
        <>
          <Box>
            <Button variant="soft" color="gray" size="1" onClick={() => setDetailsOpen(true)}>
              Technical details
            </Button>
          </Box>
          <JobDetailsModal job={job} open={detailsOpen} onOpenChange={setDetailsOpen} />
        </>
      )}
    </Flex>
  )
}
