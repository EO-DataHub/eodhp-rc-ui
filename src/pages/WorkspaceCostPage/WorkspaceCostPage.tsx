import React, { useContext, useMemo, useState } from 'react'
import { Box, Button, Flex, Select, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { fetchWorkspaceCost, WorkspaceCostSummary } from '@/services/workspaceCostService'
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
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(
    () => localStorage.getItem('workspaceCostSelectedWorkspace') ?? '',
  )
  const [startDate, setStartDate] = useState<string>(
    () => localStorage.getItem('workspaceCostStartDate') ?? getDefaultStartDate(),
  )
  const [endDate, setEndDate] = useState<string>(
    () => localStorage.getItem('workspaceCostEndDate') ?? getDateInputValue(new Date()),
  )

  const { data: allWorkspaces } = useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  const workspaceOptions = useMemo(() => {
    const workspaceSet = new Set<string>()
    if (allWorkspaces) {
      allWorkspaces.forEach((workspace) => {
        if (workspace.name) workspaceSet.add(workspace.name)
      })
    }
    if (currentWorkspace) workspaceSet.add(currentWorkspace)
    return Array.from(workspaceSet).sort()
  }, [allWorkspaces, currentWorkspace])

  const onWorkspaceChange = (workspace: string) => {
    localStorage.setItem('workspaceCostSelectedWorkspace', workspace)
    setSelectedWorkspace(workspace)
  }

  const onResetFilters = () => {
    localStorage.removeItem('workspaceCostSelectedWorkspace')
    localStorage.removeItem('workspaceCostStartDate')
    localStorage.removeItem('workspaceCostEndDate')
    setSelectedWorkspace('')
    setStartDate(getDefaultStartDate())
    setEndDate(getDateInputValue(new Date()))
  }

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextStartDate = event.target.value
    localStorage.setItem('workspaceCostStartDate', nextStartDate)
    setStartDate(nextStartDate)
  }

  const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextEndDate = event.target.value
    localStorage.setItem('workspaceCostEndDate', nextEndDate)
    setEndDate(nextEndDate)
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

  const {
    data: costSummary,
    isLoading,
    error,
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
    enabled: Boolean(token && selectedWorkspace && startDate && endDate && isRangeValid),
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
            <Select.Root size="3" value={selectedWorkspace} onValueChange={onWorkspaceChange}>
              <Select.Trigger style={{ width: '100%' }} placeholder="Workspace" />
              <Select.Content position="popper">
                <Select.Group>
                  {workspaceOptions.map((workspace) => (
                    <Select.Item key={workspace} value={workspace}>
                      {workspace}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>

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

          <Box flexGrow="0" flexShrink="0" ml="auto">
            <Button
              size="3"
              variant="soft"
              color="gray"
              onClick={onResetFilters}
              style={{ minWidth: '160px' }}
            >
              Reset Filters
            </Button>
          </Box>
        </Flex>

        {!selectedWorkspace && (
          <Callout
            type="info"
            message="Select a workspace to view cost details for the selected date range."
          />
        )}
        {selectedWorkspace && rangeValidationMessage && (
          <Callout type="error" message={rangeValidationMessage} />
        )}

        {isLoading && selectedWorkspace && isRangeValid && <LoadingIndicator size="3" />}

        {error && selectedWorkspace && (
          <Callout
            type="error"
            message={
              error instanceof Error
                ? error.message
                : 'Unable to load workspace cost details. Please try again later.'
            }
          />
        )}

        {costSummary && !isLoading && !error && (
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
