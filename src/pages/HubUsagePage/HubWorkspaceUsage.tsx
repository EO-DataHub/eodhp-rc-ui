import React, { useContext, useMemo, useState } from 'react'
import { Box, Button, Card, Flex, SegmentedControl, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchWorkspaceBalance,
  fetchWorkspaceUsageData,
  TimeAggregation,
} from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { useSkusBySku } from '@/hooks/useSkusBySku'
import { formatCredits, formatQuantity } from '@/library/usageFormatting'
import { formatPeriodLabel, getPeriodEnd } from '@/library/usagePeriods'
import styles from './HubUsagePage.module.scss'

type DisplayMode = 'credits' | 'raw'

interface HubWorkspaceUsageProps {
  workspace: string
  granularity: TimeAggregation
  periodStart: Date
  onBack: () => void
}

// One workspace's usage by resource for the period the overview shows. It ignores the
// overview's resource filter, so every resource the workspace used is listed. Hub admins can
// read any workspace's usage and balance through the per-workspace endpoints.
export const HubWorkspaceUsage: React.FC<HubWorkspaceUsageProps> = ({
  workspace,
  granularity,
  periodStart,
  onBack,
}) => {
  const { token, userInfo } = useContext(AuthenticationContext)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('credits')

  const {
    data: usageRows,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'HubWorkspaceUsage',
      workspace,
      granularity,
      periodStart.toISOString(),
      userInfo?.sub,
    ],
    queryFn: () =>
      fetchWorkspaceUsageData(workspace, token!, {
        start: periodStart.toISOString(),
        end: getPeriodEnd(periodStart, granularity).toISOString(),
        timeAggregation: granularity,
        groupBy: ['sku'],
      }),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const { data: balance, error: balanceError } = useQuery({
    queryKey: ['HubWorkspaceBalance', workspace, userInfo?.sub],
    queryFn: () => fetchWorkspaceBalance(workspace, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const skusBySku = useSkusBySku(token, userInfo?.sub)
  const resourceLabel = (sku: string) => skusBySku.get(sku)?.name ?? sku

  // Largest first by credits, whichever value is on show, so the order doesn't jump when the
  // display mode changes.
  const usageByItem = useMemo(() => {
    const totals = new Map<string, { credits: number; quantity: number }>()
    usageRows?.forEach((row) => {
      const total = totals.get(row.item) ?? { credits: 0, quantity: 0 }
      total.credits += Number(row.credits)
      total.quantity += row.quantity
      totals.set(row.item, total)
    })
    return Array.from(totals.entries())
      .map(([item, total]) => ({ item, ...total }))
      .sort((a, b) => b.credits - a.credits)
  }, [usageRows])

  const balanceValue = balance ? Number(balance.balance) : null

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Button variant="ghost" onClick={onBack}>
          ← Back to all workspaces
        </Button>
      </Box>

      <Flex direction="column" gap="1">
        <Text size="5" weight="bold">
          {workspace}
        </Text>
        <Text size="2" color="gray">
          {formatPeriodLabel(periodStart, granularity)}
        </Text>
      </Flex>

      {balanceError && (
        <Callout
          type="error"
          message={
            balanceError instanceof Error ? balanceError.message : 'Failed to load credit balance.'
          }
        />
      )}

      {balanceValue !== null && !Number.isNaN(balanceValue) && (
        <Card className={styles.statCard}>
          <Text as="p" size="2" color="gray">
            Current balance
          </Text>
          <Text as="p" size="6" weight="bold" color={balanceValue < 0 ? 'red' : undefined}>
            {formatCredits(balanceValue)}
          </Text>
        </Card>
      )}

      {error && (
        <Callout
          type="error"
          message={error instanceof Error ? error.message : 'Failed to load usage data.'}
        />
      )}

      {isLoading && <LoadingIndicator size="3" />}

      {!isLoading && !error && usageByItem.length === 0 && (
        <Callout type="info" message="No usage recorded for this workspace in this period." />
      )}

      {!isLoading && !error && usageByItem.length > 0 && (
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Text size="2" weight="medium">
              Usage by resource
            </Text>
            <SegmentedControl.Root
              value={displayMode}
              onValueChange={(value) => setDisplayMode(value as DisplayMode)}
            >
              <SegmentedControl.Item value="credits">Credits</SegmentedControl.Item>
              <SegmentedControl.Item value="raw">Raw usage</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>
          <Table.Root className={styles.usageTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>
                  {displayMode === 'credits' ? 'Credits' : 'Quantity'}
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {usageByItem.map((row) => (
                <Table.Row key={row.item}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {resourceLabel(row.item)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {displayMode === 'credits'
                      ? formatCredits(row.credits)
                      : `${formatQuantity(row.quantity)} ${skusBySku.get(row.item)?.unit ?? ''}`}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Text size="1" color="gray">
            {displayMode === 'credits'
              ? 'Credits reflect the pricing policy in force when each event was charged, including any workspace category adjustment.'
              : 'Raw quantity per resource, in the unit defined for that SKU.'}
          </Text>
        </Flex>
      )}
    </Flex>
  )
}
