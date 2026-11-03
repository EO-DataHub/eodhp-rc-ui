import React, { useCallback, useContext, useMemo, useState } from 'react'
import { Flex, Select, Text, TextField } from '@radix-ui/themes'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchAllHubUsageData,
  fetchSkus,
  fetchWorkspaceSummaries,
} from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { HUB_QUERY_CACHE } from './hubQueryOptions'
import { PeriodControls } from './PeriodControls'
import {
  buildRanking,
  defaultDirection,
  parseCredits,
  SortColumn,
  SortDirection,
  sortRanking,
} from './hubRanking'
import { BalancesState, RankingTable } from './RankingTable'
import { useHubUsageSearchParams } from './useHubUsageSearchParams'

const ALL_SKUS = 'all'

export const HubUsagePage: React.FC = () => {
  const { token, userInfo } = useContext(AuthenticationContext)
  const user = userInfo?.sub
  // Queries are keyed on the user, so reading before the user is known would read twice.
  const ready = Boolean(token) && Boolean(user)
  const state = useHubUsageSearchParams()
  const { periodType, period, previousPeriod, sku, name, inProgress } = state
  const navigate = useNavigate()
  const { search } = useLocation()
  const [sortColumn, setSortColumn] = useState<SortColumn>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending')

  const summariesQuery = useQuery({
    queryKey: ['hubWorkspaceSummaries', user],
    queryFn: () => fetchWorkspaceSummaries(token!),
    enabled: ready,
    ...HUB_QUERY_CACHE,
  })

  const skusQuery = useQuery({
    queryKey: ['skus', user],
    queryFn: () => fetchSkus(token!),
    enabled: ready,
    ...HUB_QUERY_CACHE,
    // The ranking waits for this list, so a failure should not hold it back for long.
    retry: 1,
  })

  const skuName = useCallback(
    (code: string) => skusQuery.data?.find((item) => item.sku === code)?.name ?? code,
    [skusQuery.data],
  )
  const skuLabel = sku ? skuName(sku) : 'All SKUs'

  const rangeStart = previousPeriod.start.toISOString()
  const rangeEnd = period.end.toISOString()
  const usageQuery = useQuery({
    queryKey: ['hubUsage', user, periodType, rangeStart, rangeEnd, sku],
    queryFn: () =>
      fetchAllHubUsageData(token!, {
        start: rangeStart,
        end: rangeEnd,
        timeAggregation: periodType,
        groupBy: ['workspace', 'sku'],
        sku: sku || undefined,
      }),
    // Waits for the SKU list to settle so rows first render with SKU names, but a failed
    // list does not block the ranking: names then fall back to the SKU code.
    enabled: ready && !skusQuery.isPending,
    ...HUB_QUERY_CACHE,
  })

  const ranking = useMemo(() => {
    const balances = new Map(
      (summariesQuery.data ?? []).map((ws) => [ws.workspace, parseCredits(ws.balance)]),
    )
    return buildRanking(usageQuery.data ?? [], period.start, balances)
  }, [usageQuery.data, summariesQuery.data, period])

  // Change is hidden while the period is in progress, so its sort falls back to total.
  const hidesSortColumn =
    (sortColumn === 'change' && inProgress) || (sortColumn === 'topSku' && Boolean(sku))
  const activeColumn = hidesSortColumn ? 'total' : sortColumn
  const activeDirection = hidesSortColumn ? 'descending' : sortDirection

  // The name filter only hides rows; share and the totals row still cover every workspace.
  const emptyMessage =
    ranking.rows.length > 0
      ? 'No workspaces match'
      : sku
        ? 'No usage of this SKU in this period'
        : 'No usage in this period'

  const visibleRows = useMemo(() => {
    const needle = name.toLowerCase()
    const matching = ranking.rows.filter((row) => row.workspace.toLowerCase().includes(needle))
    return sortRanking(matching, activeColumn, activeDirection, skuName)
  }, [ranking, name, activeColumn, activeDirection, skuName])

  const idleCount = useMemo(() => {
    if (!summariesQuery.data) return undefined
    const ranked = new Set(ranking.rows.map((row) => row.workspace))
    return summariesQuery.data.filter((ws) => !ranked.has(ws.workspace)).length
  }, [summariesQuery.data, ranking])

  const handleSort = (column: SortColumn) => {
    if (column === activeColumn) {
      setSortColumn(column)
      setSortDirection(activeDirection === 'ascending' ? 'descending' : 'ascending')
    } else {
      setSortColumn(column)
      setSortDirection(defaultDirection(column))
    }
  }

  const workspaceLink = (workspace: string) => ({
    pathname: `/accounting/hub/${encodeURIComponent(workspace)}`,
    search,
  })
  const openWorkspace = (workspace: string) => navigate(workspaceLink(workspace))

  // SKUs only supply display names and the summaries only supply balances, so neither blocks
  // the ranking. A disabled usage query is pending but not loading, so pending holds it back.
  const error = usageQuery.error
  const isLoading = usageQuery.isPending
  const balances: BalancesState = summariesQuery.isPending
    ? 'loading'
    : summariesQuery.isError
      ? 'error'
      : 'ready'

  return (
    <Flex direction="column" gap="4" p="4">
      <PageHeading title="All workspaces" badge="none" />

      <PeriodControls
        periodType={periodType}
        period={period}
        inProgress={state.inProgress}
        onPeriodTypeChange={state.setPeriodType}
        onStep={state.stepPeriod}
        onSelectDate={state.selectDate}
      />

      <Flex gap="3" align="center" wrap="wrap">
        <Select.Root
          value={sku || ALL_SKUS}
          onValueChange={(value) => state.setSku(value === ALL_SKUS ? '' : value)}
        >
          <Select.Trigger aria-label="SKU">{skuLabel}</Select.Trigger>
          <Select.Content position="popper">
            <Select.Item value={ALL_SKUS}>All SKUs</Select.Item>
            {(skusQuery.data ?? []).map((item) => (
              <Select.Item key={item.sku} value={item.sku}>
                {item.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <TextField.Root
          aria-label="Workspace name"
          placeholder="Filter by workspace name"
          value={name}
          onChange={(event) => state.setName(event.target.value)}
        />
      </Flex>

      {isLoading && <LoadingIndicator />}
      {error && <Callout type="error" message={error.message} />}
      {skusQuery.error && !error && (
        <Callout type="warning" message={`SKU names are unavailable: ${skusQuery.error.message}`} />
      )}
      {summariesQuery.error && !error && (
        <Callout
          type="warning"
          message={`Balances could not be loaded: ${summariesQuery.error.message}`}
        />
      )}

      {!isLoading && !error && (
        <Flex direction="column" gap="2">
          <RankingTable
            rows={visibleRows}
            total={ranking.total}
            showTopSku={!sku}
            showChange={!inProgress}
            sortColumn={activeColumn}
            sortDirection={activeDirection}
            onSort={handleSort}
            onOpen={openWorkspace}
            workspaceLink={workspaceLink}
            emptyMessage={emptyMessage}
            skuName={skuName}
            balances={balances}
          />
          {idleCount !== undefined && idleCount > 0 && (
            <Text size="2" color="gray">
              {`${idleCount} ${idleCount === 1 ? 'workspace' : 'workspaces'} had no usage${
                sku ? ' of this SKU' : ''
              } in this period`}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  )
}
