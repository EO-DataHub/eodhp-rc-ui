import React, { useCallback, useContext, useMemo, useState } from 'react'
import { DataList, Flex, SegmentedControl, Table, Text } from '@radix-ui/themes'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchAllAggregatedWorkspaceUsageData,
  fetchSkus,
  fetchWorkspaceSummaries,
} from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { HUB_QUERY_CACHE } from './hubQueryOptions'
import { PeriodControls } from './PeriodControls'
import {
  buildSkuUsage,
  formatChange,
  formatCredits,
  formatQuantity,
  formatQuantityChange,
  parseCredits,
} from './hubRanking'
import { useHubUsageSearchParams } from './useHubUsageSearchParams'
import styles from './HubUsagePage.module.scss'

type ValueMode = 'credits' | 'raw'

// The ranking's own state, carried back by the back link.
const RANKING_PARAMS = ['type', 'start', 'sku', 'name']

export const HubWorkspaceUsagePage: React.FC = () => {
  const { token, userInfo } = useContext(AuthenticationContext)
  const user = userInfo?.sub
  // Queries are keyed on the user, so reading before the user is known would read twice.
  const ready = Boolean(token) && Boolean(user)
  const { workspace = '' } = useParams<{ workspace: string }>()
  const state = useHubUsageSearchParams()
  const { periodType, period, previousPeriod, sku, inProgress } = state
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<ValueMode>('credits')

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
    retry: 1,
  })

  const skuInfo = useCallback(
    (code: string) => skusQuery.data?.find((item) => item.sku === code),
    [skusQuery.data],
  )

  const rangeStart = previousPeriod.start.toISOString()
  const rangeEnd = period.end.toISOString()
  // Every SKU the workspace used is listed, so the ranking's SKU filter is not sent here.
  const usageQuery = useQuery({
    queryKey: ['hubWorkspaceUsage', user, workspace, periodType, rangeStart, rangeEnd],
    queryFn: () =>
      fetchAllAggregatedWorkspaceUsageData(workspace, token!, {
        start: rangeStart,
        end: rangeEnd,
        timeAggregation: periodType,
        groupBy: ['sku'],
      }),
    enabled: ready && Boolean(workspace) && !skusQuery.isPending,
    ...HUB_QUERY_CACHE,
  })

  const rows = useMemo(
    () => buildSkuUsage(usageQuery.data ?? [], period.start),
    [usageQuery.data, period],
  )

  const summary = summariesQuery.data?.find((ws) => ws.workspace === workspace)
  const balance = summary ? parseCredits(summary.balance) : undefined

  const backSearch = useMemo(() => {
    const next = new URLSearchParams()
    RANKING_PARAMS.forEach((key) => {
      const value = searchParams.get(key)
      if (value) next.set(key, value)
    })
    const text = next.toString()
    return text ? `?${text}` : ''
  }, [searchParams])

  // The balance, account and category fill in when they arrive; only usage holds the table back.
  const error = usageQuery.error
  const isLoading = usageQuery.isPending
  const raw = mode === 'raw'

  return (
    <Flex direction="column" gap="4" p="4">
      <Link to={{ pathname: '/accounting/hub', search: backSearch }}>← Back to all workspaces</Link>
      <PageHeading title={workspace} badge="none" />

      {summary && (
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>Balance now</DataList.Label>
            <DataList.Value>{balance === undefined ? '' : formatCredits(balance)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Account</DataList.Label>
            <DataList.Value>{summary.account ?? 'No account'}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Category</DataList.Label>
            <DataList.Value>{summary.category}</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      )}

      <PeriodControls
        periodType={periodType}
        period={period}
        inProgress={inProgress}
        onPeriodTypeChange={state.setPeriodType}
        onStep={state.stepPeriod}
        onSelectDate={state.selectDate}
      />

      <SegmentedControl.Root value={mode} onValueChange={(value) => setMode(value as ValueMode)}>
        <SegmentedControl.Item value="credits">Credits</SegmentedControl.Item>
        <SegmentedControl.Item value="raw">Raw usage</SegmentedControl.Item>
      </SegmentedControl.Root>

      {isLoading && <LoadingIndicator />}
      {error && <Callout type="error" message={error.message} />}
      {skusQuery.error && !error && (
        <Callout type="warning" message={`SKU names are unavailable: ${skusQuery.error.message}`} />
      )}
      {summariesQuery.error && (
        <Callout
          type="warning"
          message={`Balance and account could not be loaded: ${summariesQuery.error.message}`}
        />
      )}

      {!isLoading && !error && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>SKU</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">
                {raw ? 'Usage' : 'Credits'}
              </Table.ColumnHeaderCell>
              {!inProgress && <Table.ColumnHeaderCell align="right">Change</Table.ColumnHeaderCell>}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={inProgress ? 2 : 3}>
                  <Text color="gray">No usage in this period</Text>
                </Table.Cell>
              </Table.Row>
            )}
            {rows.map((row) => {
              const info = skuInfo(row.sku)
              const selected = Boolean(sku) && row.sku === sku
              const withUnit = (value: string) => (info?.unit ? `${value} ${info.unit}` : value)
              return (
                <Table.Row
                  key={row.sku}
                  aria-selected={selected}
                  className={selected ? styles.selectedRow : undefined}
                >
                  <Table.Cell>{info?.name ?? row.sku}</Table.Cell>
                  <Table.Cell align="right">
                    {raw ? withUnit(formatQuantity(row.quantity)) : formatCredits(row.credits)}
                  </Table.Cell>
                  {!inProgress && (
                    <Table.Cell align="right">
                      {raw
                        ? row.quantityChange === undefined
                          ? formatQuantityChange(undefined)
                          : withUnit(formatQuantityChange(row.quantityChange))
                        : formatChange(row.creditChange)}
                    </Table.Cell>
                  )}
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      )}
    </Flex>
  )
}
