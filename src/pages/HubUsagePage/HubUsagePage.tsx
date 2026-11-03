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
import { PeriodControls } from './PeriodControls'
import {
  buildRanking,
  defaultDirection,
  SortColumn,
  SortDirection,
  sortRanking,
} from './hubRanking'
import { RankingTable } from './RankingTable'
import { useHubUsageSearchParams } from './useHubUsageSearchParams'

const ALL_SKUS = 'all'

export const HubUsagePage: React.FC = () => {
  const { token } = useContext(AuthenticationContext)
  const state = useHubUsageSearchParams()
  const { periodType, period, previousPeriod, sku, name, inProgress } = state
  const navigate = useNavigate()
  const { search } = useLocation()
  const [sortColumn, setSortColumn] = useState<SortColumn>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending')

  const summariesQuery = useQuery({
    queryKey: ['hubWorkspaceSummaries', token],
    queryFn: () => fetchWorkspaceSummaries(token!),
    enabled: Boolean(token),
  })

  const skusQuery = useQuery({
    queryKey: ['skus', token],
    queryFn: () => fetchSkus(token!),
    enabled: Boolean(token),
  })

  const skuName = useCallback(
    (code: string) => skusQuery.data?.find((item) => item.sku === code)?.name ?? code,
    [skusQuery.data],
  )
  const skuLabel = sku ? skuName(sku) : 'All SKUs'

  const rangeStart = previousPeriod.start.toISOString()
  const rangeEnd = period.end.toISOString()
  const usageQuery = useQuery({
    queryKey: ['hubUsage', token, periodType, rangeStart, rangeEnd, sku],
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
    enabled: Boolean(token) && !skusQuery.isPending,
  })

  const ranking = useMemo(() => {
    const balances = new Map(
      (summariesQuery.data ?? []).map((ws) => [ws.workspace, Number(ws.balance)]),
    )
    return buildRanking(usageQuery.data ?? [], period.start, balances)
  }, [usageQuery.data, summariesQuery.data, period])

  // Change is hidden while the period is in progress, so its sort falls back to total.
  const hidesSortColumn =
    (sortColumn === 'change' && inProgress) || (sortColumn === 'topSku' && Boolean(sku))
  const activeColumn = hidesSortColumn ? 'total' : sortColumn
  const activeDirection = hidesSortColumn ? 'descending' : sortDirection

  // The name filter only hides rows; share and the totals row still cover every workspace.
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

  const openWorkspace = (workspace: string) =>
    navigate({ pathname: `/accounting/hub/${encodeURIComponent(workspace)}`, search })

  // SKUs only supply display names, so a failed SKU list does not block the ranking.
  const error = summariesQuery.error ?? usageQuery.error
  const isLoading = summariesQuery.isLoading || usageQuery.isLoading

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
            skuName={skuName}
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
