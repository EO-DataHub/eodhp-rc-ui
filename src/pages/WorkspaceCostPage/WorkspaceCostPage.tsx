import React, { useContext, useEffect, useLayoutEffect, useMemo } from 'react'
import { Box, Button, Flex, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchWorkspaceCost,
  fetchWorkspacesCostOverview,
  WorkspaceCostSummary,
} from '@/services/workspaceCostService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import sharedStyles from '../MyDataPage/MyDataPage.module.scss'
import styles from './WorkspaceCostPage.module.scss'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_RANGE_DAYS = 15

const getDateInputValue = (date: Date): string => date.toISOString().slice(0, 10)
const getDefaultStartDate = (): string => {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - 13)
  return getDateInputValue(startDate)
}
const toUtcStartIso = (dateInput: string): string =>
  new Date(`${dateInput}T00:00:00.000Z`).toISOString()
const toUtcEndIso = (dateInput: string): string =>
  new Date(`${dateInput}T00:00:00.000Z`).toISOString()
const getInclusiveDayCount = (startDateInput: string, endDateInput: string): number => {
  const startDate = new Date(`${startDateInput}T00:00:00.000Z`)
  const endDate = new Date(`${endDateInput}T00:00:00.000Z`)
  const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY)
  return diffDays
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

export const WorkspaceCostPage: React.FC = () => {
  const { token } = useContext(AuthenticationContext)
  const [searchParams, setSearchParams] = useSearchParams()

  useLayoutEffect(() => {
    const next = new URLSearchParams(searchParams)
    let changed = false
    if (!next.get('start')) {
      next.set('start', localStorage.getItem('workspaceCostStartDate') ?? getDefaultStartDate())
      changed = true
    }
    if (!next.get('end')) {
      next.set('end', localStorage.getItem('workspaceCostEndDate') ?? getDateInputValue(new Date()))
      changed = true
    }
    if (changed) {
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const startDate =
    searchParams.get('start') ??
    localStorage.getItem('workspaceCostStartDate') ??
    getDefaultStartDate()
  const endDate =
    searchParams.get('end') ??
    localStorage.getItem('workspaceCostEndDate') ??
    getDateInputValue(new Date())
  const selectedWorkspace = searchParams.get('workspace') ?? ''

  useEffect(() => {
    localStorage.setItem('workspaceCostStartDate', startDate)
    localStorage.setItem('workspaceCostEndDate', endDate)
    if (selectedWorkspace) {
      localStorage.setItem('workspaceCostSelectedWorkspace', selectedWorkspace)
    } else {
      localStorage.removeItem('workspaceCostSelectedWorkspace')
    }
  }, [startDate, endDate, selectedWorkspace])

  const updateSearchParams = (mutate: (p: URLSearchParams) => void) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        mutate(p)
        return p
      },
      { replace: true },
    )
  }

  const clearWorkspaceSelection = () => {
    updateSearchParams((p) => {
      p.delete('workspace')
    })
  }

  const onWorkspaceRowActivate = (workspaceId: string) => {
    updateSearchParams((p) => {
      p.set('workspace', workspaceId)
    })
  }

  const onResetFilters = () => {
    localStorage.removeItem('workspaceCostSelectedWorkspace')
    localStorage.removeItem('workspaceCostStartDate')
    localStorage.removeItem('workspaceCostEndDate')
    const next = new URLSearchParams(searchParams)
    next.delete('workspace')
    next.set('start', getDefaultStartDate())
    next.set('end', getDateInputValue(new Date()))
    setSearchParams(next, { replace: true })
  }

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextStartDate = event.target.value
    updateSearchParams((p) => {
      p.set('start', nextStartDate)
    })
  }

  const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextEndDate = event.target.value
    updateSearchParams((p) => {
      p.set('end', nextEndDate)
    })
  }

  const dayCount = getInclusiveDayCount(startDate, endDate)
  const isRangeOrderValid = startDate <= endDate
  const isRangeLengthValid = dayCount <= MAX_RANGE_DAYS
  const isRangeValid = isRangeOrderValid && isRangeLengthValid
  const rangeValidationMessage = !isRangeOrderValid
    ? 'Start date must be before or equal to end date.'
    : !isRangeLengthValid
      ? `Date range cannot exceed ${MAX_RANGE_DAYS} days.`
      : null

  const datesInUrl = Boolean(searchParams.get('start') && searchParams.get('end'))
  const costQueryReady = Boolean(token && startDate && endDate && isRangeValid && datesInUrl)

  const {
    data: overview,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ['WorkspacesCostOverview', startDate, endDate, token],
    queryFn: async () =>
      fetchWorkspacesCostOverview({
        start: toUtcStartIso(startDate),
        end: toUtcEndIso(endDate),
        token: token!,
      }),
    refetchOnWindowFocus: false,
    enabled: costQueryReady,
  })

  const sortedOverviewRows = useMemo(() => {
    if (!overview?.workspaces?.length) return []
    return [...overview.workspaces].sort((a, b) => b.totalCost - a.totalCost)
  }, [overview])

  const {
    data: costSummary,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery<WorkspaceCostSummary>({
    queryKey: ['WorkspaceCost', selectedWorkspace, startDate, endDate, token],
    queryFn: async () =>
      fetchWorkspaceCost({
        workspace: selectedWorkspace,
        start: toUtcStartIso(startDate),
        end: toUtcEndIso(endDate),
        token: token!,
      }),
    refetchOnWindowFocus: false,
    enabled: costQueryReady && Boolean(selectedWorkspace),
  })

  const breakdownRows = useMemo(() => {
    if (!costSummary) return []
    return [
      { label: 'CPU', value: costSummary.breakdown.cpuCost },
      { label: 'RAM', value: costSummary.breakdown.ramCost },
      { label: 'Persistent volumes', value: costSummary.breakdown.pvCost },
      { label: 'Network', value: costSummary.breakdown.networkCost },
      { label: 'Load balancers', value: costSummary.breakdown.loadBalancerCost },
      { label: 'External', value: costSummary.breakdown.externalCost },
    ]
  }, [costSummary])

  return (
    <Flex direction="column" gap="7" height="100vh" className={sharedStyles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Workspace cost
        </Text>
        <Text size="3" color="gray">
          View workspace cost summaries for a selected date range (max 15 days)
        </Text>
      </Flex>

      <Flex direction="column" gap="5">
        <Flex
          p="5"
          direction="row"
          gap="2"
          align="center"
          justify="start"
          className={sharedStyles.filterContainer}
          overflow="auto"
        >
          <Box flexGrow="0" width="220px" flexShrink="0">
            <input
              type="date"
              value={startDate}
              onChange={onStartDateChange}
              className={styles.dateInput}
              aria-label="Start date"
              autoComplete="off"
              name="workspace-cost-start-date"
              data-lpignore="true"
              data-1p-ignore="true"
            />
          </Box>

          <Box flexGrow="0" width="220px" flexShrink="0">
            <input
              type="date"
              value={endDate}
              onChange={onEndDateChange}
              className={styles.dateInput}
              aria-label="End date"
              autoComplete="off"
              name="workspace-cost-end-date"
              data-lpignore="true"
              data-1p-ignore="true"
            />
          </Box>

          <Flex flexGrow="0" flexShrink="0" ml="auto" gap="2" align="center">
            {selectedWorkspace ? (
              <Button size="3" variant="ghost" color="gray" onClick={clearWorkspaceSelection}>
                Clear workspace
              </Button>
            ) : null}
            <Button
              size="3"
              variant="soft"
              color="gray"
              onClick={onResetFilters}
              style={{ minWidth: '160px' }}
            >
              Reset Filters
            </Button>
          </Flex>
        </Flex>

        {rangeValidationMessage && <Callout type="error" message={rangeValidationMessage} />}

        {!selectedWorkspace && (
          <Callout
            type="info"
            message="Select a workspace in the table below to view a detailed cost breakdown."
          />
        )}

        {costQueryReady && isOverviewLoading && <LoadingIndicator size="3" />}

        {overviewError && (
          <Callout
            type="error"
            message={
              overviewError instanceof Error
                ? overviewError.message
                : 'Unable to load workspace cost overview. Please try again later.'
            }
          />
        )}

        {overview && !isOverviewLoading && !overviewError && (
          <Flex className={styles.sectionCard} direction="column" gap="3">
            <Flex justify="between" align="start" gap="4" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text size="4" weight="medium">
                  All workspaces
                </Text>
                <Text size="2" color="gray">
                  Total across your workspaces from {startDate} to {endDate} ({dayCount} day
                  {dayCount === 1 ? '' : 's'})
                </Text>
              </Flex>
              <Flex direction="column" gap="1" align="end">
                <Text size="2" color="gray">
                  Combined total
                </Text>
                <Text size="6" weight="bold">
                  {formatCurrency(overview.totalCost)}
                </Text>
              </Flex>
            </Flex>

            {sortedOverviewRows.length === 0 ? (
              <Text size="2" color="gray">
                No workspace cost data for this period.
              </Text>
            ) : (
              <Table.Root className={sharedStyles.ordersTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Workspace</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>
                      Total cost
                    </Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedOverviewRows.map((row) => (
                    <Table.Row
                      key={row.workspaceId}
                      className={`${styles.overviewRow} ${row.workspaceId === selectedWorkspace ? styles.overviewRowSelected : ''}`}
                      onClick={() => onWorkspaceRowActivate(row.workspaceId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onWorkspaceRowActivate(row.workspaceId)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View cost details for ${row.workspaceId}`}
                      aria-selected={row.workspaceId === selectedWorkspace}
                    >
                      <Table.Cell>
                        <Text weight="medium">{row.workspaceId}</Text>
                      </Table.Cell>
                      <Table.Cell style={{ textAlign: 'right' }}>
                        {formatCurrency(row.totalCost)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Flex>
        )}

        {isDetailLoading && selectedWorkspace && isRangeValid && <LoadingIndicator size="3" />}

        {detailError && selectedWorkspace && (
          <Callout
            type="error"
            message={
              detailError instanceof Error
                ? detailError.message
                : 'Unable to load workspace cost details. Please try again later.'
            }
          />
        )}

        {costSummary && !isDetailLoading && !detailError && selectedWorkspace && (
          <Flex direction="column" gap="4">
            <Flex className={styles.totalCard} direction="column" gap="2">
              <Text size="2" color="gray">
                Total cost from {startDate} to {endDate} ({dayCount} day{dayCount === 1 ? '' : 's'})
              </Text>
              <Text size="8" weight="bold">
                {formatCurrency(costSummary.totalCost)}
              </Text>
              <Text size="2" color="gray">
                Namespace: {costSummary.namespace}
              </Text>
            </Flex>

            <Flex className={styles.sectionCard} direction="column" gap="3">
              <Text size="4" weight="medium">
                Cost breakdown
              </Text>
              <Table.Root className={sharedStyles.ordersTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Cost</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {breakdownRows.map((row) => (
                    <Table.Row key={row.label}>
                      <Table.Cell>{row.label}</Table.Cell>
                      <Table.Cell>{formatCurrency(row.value)}</Table.Cell>
                    </Table.Row>
                  ))}
                  {Object.entries(costSummary.breakdown.adjustments).map(([name, value]) => (
                    <Table.Row key={name}>
                      <Table.Cell>Adjustment: {name}</Table.Cell>
                      <Table.Cell>{formatCurrency(value)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Flex>

            <Flex className={styles.sectionCard} direction="column" gap="3">
              <Text size="4" weight="medium">
                Top drivers
              </Text>
              {costSummary.topDrivers.length === 0 ? (
                <Text size="2" color="gray">
                  No top cost drivers were returned for this period.
                </Text>
              ) : (
                <Table.Root className={sharedStyles.ordersTable}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Driver</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Cost</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Share</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {costSummary.topDrivers.map((driver) => (
                      <Table.Row key={driver.name}>
                        <Table.Cell>{driver.name}</Table.Cell>
                        <Table.Cell>{formatCurrency(driver.cost)}</Table.Cell>
                        <Table.Cell>{(driver.share * 100).toFixed(1)}%</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Flex>

            <Flex className={styles.sectionCard} direction="column" gap="2">
              <Text size="4" weight="medium">
                Notes
              </Text>
              {costSummary.notes.length === 0 ? (
                <Text size="2" color="gray">
                  No notes for this period.
                </Text>
              ) : (
                costSummary.notes.map((note) => (
                  <Text key={note} size="2" color="gray">
                    {note}
                  </Text>
                ))
              )}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Flex>
  )
}
