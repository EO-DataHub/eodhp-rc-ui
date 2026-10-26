import React, { useContext, useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Card,
  Flex,
  IconButton,
  SegmentedControl,
  Select,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes'
import {
  CaretDownIcon,
  CaretSortIcon,
  CaretUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchAllWorkspacesUsageData, TimeAggregation } from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { useSkusBySku } from '@/hooks/useSkusBySku'
import { formatCredits } from '@/library/usageFormatting'
import {
  formatPeriodLabel,
  fromDateParam,
  getPeriodEnd,
  getPeriodStart,
  isPeriodInProgress,
  isTimeAggregation,
  shiftPeriod,
  toDateParam,
} from '@/library/usagePeriods'
import {
  getUsageChange,
  summarizeWorkspaceUsage,
  WorkspaceUsageSummary,
} from '@/library/workspaceUsageSummary'
import { HubWorkspaceUsage } from './HubWorkspaceUsage'
import styles from './HubUsagePage.module.scss'

// Usage across every workspace, for hub admins. One aggregated request covers the selected
// period and, once that period is over, the one before it for the change column. While the
// period is still in progress the change is hidden: a part-period against a whole one makes
// almost every workspace look like it is falling.
//
// The request asks for far more rows than a period should have and does not page: paging
// with `after` over aggregated rows can fail when a total changes underneath it. A full
// response means rows may be missing, so the page says so rather than showing a wrong total.
const USAGE_ROW_LIMIT = 5000

const GRANULARITY_LABELS: Record<TimeAggregation, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
}

type SortColumn = 'workspace' | 'credits' | 'change'

const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`

const formatChange = (change: number) => {
  const percent = Math.round(change * 100)
  return `${percent > 0 ? '+' : ''}${percent}%`
}

export const HubUsagePage: React.FC = () => {
  const { token, isHubAdmin, userInfo } = useContext(AuthenticationContext)
  const [searchParams, setSearchParams] = useSearchParams()

  const [nameFilter, setNameFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('credits')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Granularity, period, drill-down workspace and SKU filter live in the URL, so a view can be
  // shared as a link.
  const periodParam = searchParams.get('period')
  const granularity: TimeAggregation = isTimeAggregation(periodParam) ? periodParam : 'month'
  const selectedWorkspace = searchParams.get('workspace')
  const selectedSku = searchParams.get('sku') ?? 'all'

  const currentPeriodStart = getPeriodStart(new Date(), granularity)
  const requestedStart = getPeriodStart(
    fromDateParam(searchParams.get('date')) ?? new Date(),
    granularity,
  )
  // No usage exists in a future period, so the stepper stops at the current one.
  const periodStart =
    requestedStart.getTime() > currentPeriodStart.getTime() ? currentPeriodStart : requestedStart
  const periodEnd = getPeriodEnd(periodStart, granularity)
  const inProgress = isPeriodInProgress(periodStart, granularity)
  const previousPeriodStart = inProgress ? null : shiftPeriod(periodStart, granularity, -1)

  const updateParams = (changes: Record<string, string | null>) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null) next.delete(key)
          else next.set(key, value)
        })
        return next
      },
      { replace: true },
    )
  }

  const goToPeriod = (start: Date) => updateParams({ date: toDateParam(start) })

  const {
    data: usageRows,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'HubUsage',
      granularity,
      periodStart.toISOString(),
      previousPeriodStart?.toISOString(),
      selectedSku,
      userInfo?.sub,
    ],
    queryFn: () =>
      fetchAllWorkspacesUsageData(token!, {
        start: (previousPeriodStart ?? periodStart).toISOString(),
        end: periodEnd.toISOString(),
        timeAggregation: granularity,
        groupBy: ['workspace', 'sku'],
        sku: selectedSku === 'all' ? undefined : selectedSku,
        limit: USAGE_ROW_LIMIT,
      }),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && isHubAdmin),
  })

  const skusBySku = useSkusBySku(token, userInfo?.sub)
  const resourceLabel = (sku: string) => skusBySku.get(sku)?.name ?? sku

  const skuOptions = useMemo(
    () => Array.from(skusBySku.entries()).sort(([, a], [, b]) => a.name.localeCompare(b.name)),
    [skusBySku],
  )

  const summary = useMemo(
    () => summarizeWorkspaceUsage(usageRows ?? [], periodStart, previousPeriodStart),
    // The Date objects are rebuilt every render; their times are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usageRows, periodStart.getTime(), previousPeriodStart?.getTime()],
  )

  const showChange = previousPeriodStart !== null
  const effectiveSortColumn: SortColumn =
    sortColumn === 'change' && !showChange ? 'credits' : sortColumn

  const visibleWorkspaces = useMemo(() => {
    const filter = nameFilter.trim().toLowerCase()
    const rows = filter
      ? summary.workspaces.filter(({ workspace }) => workspace.toLowerCase().includes(filter))
      : summary.workspaces

    const compare = (a: WorkspaceUsageSummary, b: WorkspaceUsageSummary) => {
      switch (effectiveSortColumn) {
        case 'workspace':
          return a.workspace.localeCompare(b.workspace)
        case 'credits':
          return a.credits - b.credits
        case 'change': {
          const changeA = getUsageChange(a) ?? 0
          const changeB = getUsageChange(b) ?? 0
          // Infinity - Infinity is NaN, which would leave new workspaces unordered.
          return changeA === changeB ? 0 : changeA - changeB
        }
      }
    }

    return [...rows].sort((a, b) => (sortDirection === 'asc' ? compare(a, b) : -compare(a, b)))
  }, [summary, nameFilter, effectiveSortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      // Names read naturally A-Z; numbers are most useful largest first.
      setSortDirection(column === 'workspace' ? 'asc' : 'desc')
    }
  }

  const renderSortIcon = (column: SortColumn) => {
    if (effectiveSortColumn !== column) return <CaretSortIcon />
    return sortDirection === 'asc' ? <CaretUpIcon /> : <CaretDownIcon />
  }

  const renderChange = (row: WorkspaceUsageSummary) => {
    const change = getUsageChange(row)
    if (change === null) return '—'
    if (change === Infinity) {
      return (
        <Badge color="blue" variant="soft">
          New
        </Badge>
      )
    }
    return formatChange(change)
  }

  const isTruncated = (usageRows?.length ?? 0) >= USAGE_ROW_LIMIT

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <PageHeading
        title="All workspaces"
        subtitle="Credit usage across every workspace on the hub"
        badge="none"
      />

      <Flex direction="column" gap="5">
        {!token && <Callout type="info" message="Sign in to view usage across workspaces." />}

        {token && !isHubAdmin && (
          <Callout type="info" message="This page is only available to hub admins." />
        )}

        {token && isHubAdmin && (
          <>
            <Flex gap="3" align="center" wrap="wrap">
              <SegmentedControl.Root
                value={granularity}
                onValueChange={(value) => updateParams({ period: value })}
              >
                {(Object.keys(GRANULARITY_LABELS) as TimeAggregation[]).map((value) => (
                  <SegmentedControl.Item key={value} value={value}>
                    {GRANULARITY_LABELS[value]}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl.Root>

              <Flex gap="2" align="center">
                <IconButton
                  variant="soft"
                  aria-label="Previous period"
                  onClick={() => goToPeriod(shiftPeriod(periodStart, granularity, -1))}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Text size="3" weight="medium" className={styles.periodLabel}>
                  {formatPeriodLabel(periodStart, granularity)}
                </Text>
                <IconButton
                  variant="soft"
                  aria-label="Next period"
                  disabled={inProgress}
                  onClick={() => goToPeriod(shiftPeriod(periodStart, granularity, 1))}
                >
                  <ChevronRightIcon />
                </IconButton>
                {inProgress && (
                  <Badge color="amber" variant="soft">
                    In progress
                  </Badge>
                )}
              </Flex>

              <TextField.Root
                type="date"
                aria-label="Go to the period containing a date"
                value={toDateParam(periodStart)}
                max={toDateParam(new Date())}
                onChange={(event) => {
                  const date = fromDateParam(event.target.value)
                  if (date) goToPeriod(getPeriodStart(date, granularity))
                }}
              />
            </Flex>

            {selectedWorkspace ? (
              <HubWorkspaceUsage
                workspace={selectedWorkspace}
                granularity={granularity}
                periodStart={periodStart}
                onBack={() => updateParams({ workspace: null })}
              />
            ) : (
              <>
                {/* Outside the loading and error states, so a filter whose request fails
                    can still be changed back. */}
                <Flex gap="2" align="center" wrap="wrap">
                  <Box width="260px">
                    <TextField.Root
                      size="3"
                      placeholder="Filter workspaces"
                      aria-label="Filter workspaces by name"
                      value={nameFilter}
                      onChange={(event) => setNameFilter(event.target.value)}
                    >
                      <TextField.Slot>
                        <MagnifyingGlassIcon />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>
                  <Box width="220px">
                    <Select.Root
                      size="3"
                      value={selectedSku}
                      onValueChange={(value) =>
                        updateParams({ sku: value === 'all' ? null : value })
                      }
                    >
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content position="popper">
                        <Select.Item value="all">All resources</Select.Item>
                        {skuOptions.map(([sku, { name }]) => (
                          <Select.Item key={sku} value={sku}>
                            {name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Box>
                </Flex>

                {error && (
                  <Callout
                    type="error"
                    message={error instanceof Error ? error.message : 'Failed to load usage data.'}
                  />
                )}

                {isLoading && <LoadingIndicator size="3" />}

                {!isLoading && !error && (
                  <>
                    {isTruncated && (
                      <Callout
                        type="warning"
                        message={`The usage data for this period reached the ${USAGE_ROW_LIMIT}-row limit, so some workspaces or totals may be missing. Try a shorter period.`}
                      />
                    )}

                    <Flex gap="3" wrap="wrap">
                      <Card className={styles.statCard}>
                        <Text as="p" size="2" color="gray">
                          Total credits, all workspaces
                        </Text>
                        <Text as="p" size="6" weight="bold">
                          {formatCredits(summary.totalCredits)}
                        </Text>
                      </Card>
                      <Card className={styles.statCard}>
                        <Text as="p" size="2" color="gray">
                          Workspaces with usage
                        </Text>
                        <Text as="p" size="6" weight="bold">
                          {summary.workspaces.length}
                        </Text>
                      </Card>
                    </Flex>

                    {summary.workspaces.length === 0 && (
                      <Callout type="info" message="No usage recorded in this period." />
                    )}

                    {summary.workspaces.length > 0 && visibleWorkspaces.length === 0 && (
                      <Callout type="info" message="No workspaces match this filter." />
                    )}

                    {visibleWorkspaces.length > 0 && (
                      <Flex direction="column" gap="2">
                        <Box className={styles.tableWrapper}>
                          <Table.Root className={styles.usageTable}>
                            <Table.Header>
                              <Table.Row>
                                <Table.ColumnHeaderCell>
                                  <Flex
                                    align="center"
                                    gap="1"
                                    className={styles.clickable}
                                    onClick={() => handleSort('workspace')}
                                  >
                                    Workspace {renderSortIcon('workspace')}
                                  </Flex>
                                </Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>
                                  <Flex
                                    align="center"
                                    gap="1"
                                    className={styles.clickable}
                                    onClick={() => handleSort('credits')}
                                  >
                                    Credits {renderSortIcon('credits')}
                                  </Flex>
                                </Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Share of total</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Top resource</Table.ColumnHeaderCell>
                                {showChange && (
                                  <Table.ColumnHeaderCell>
                                    <Flex
                                      align="center"
                                      gap="1"
                                      className={styles.clickable}
                                      onClick={() => handleSort('change')}
                                    >
                                      Change {renderSortIcon('change')}
                                    </Flex>
                                  </Table.ColumnHeaderCell>
                                )}
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {visibleWorkspaces.map((row) => (
                                <Table.Row
                                  key={row.workspace}
                                  className={styles.clickable}
                                  onClick={() => updateParams({ workspace: row.workspace })}
                                >
                                  <Table.Cell>
                                    <Text size="2" weight="medium">
                                      {row.workspace}
                                    </Text>
                                  </Table.Cell>
                                  <Table.Cell>{formatCredits(row.credits)}</Table.Cell>
                                  <Table.Cell>{formatShare(row.share)}</Table.Cell>
                                  <Table.Cell>
                                    {row.topSku ? resourceLabel(row.topSku) : '—'}
                                  </Table.Cell>
                                  {showChange && <Table.Cell>{renderChange(row)}</Table.Cell>}
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>
                        </Box>
                        <Text size="1" color="gray">
                          Click a workspace to see its usage by resource. Workspaces with no usage
                          in this period aren&apos;t shown.
                          {showChange &&
                            ` Change compares with ${formatPeriodLabel(previousPeriodStart, granularity)}.`}
                          {selectedSku !== 'all' &&
                            ` Totals, shares and change cover ${resourceLabel(selectedSku)} only.`}
                        </Text>
                      </Flex>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
