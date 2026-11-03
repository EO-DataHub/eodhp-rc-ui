import React, { useContext, useMemo } from 'react'
import { Flex, Select, Text, TextField } from '@radix-ui/themes'
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
import { useHubUsageSearchParams } from './useHubUsageSearchParams'

const ALL_SKUS = 'all'

export const HubUsagePage: React.FC = () => {
  const { token } = useContext(AuthenticationContext)
  const state = useHubUsageSearchParams()
  const { periodType, period, previousPeriod, sku, name } = state

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

  const skuLabel = sku ? skusQuery.data?.find((item) => item.sku === sku)?.name ?? sku : 'All SKUs'

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
    // The ranking shows SKUs by name, so it waits for the SKU list.
    enabled: Boolean(token) && skusQuery.isSuccess,
  })

  // Workspaces with usage in the selected period, matching the name filter.
  const workspaces = useMemo(() => {
    const selectedStart = period.start.getTime()
    const names = new Set(
      (usageQuery.data ?? [])
        .filter((event) => new Date(event.event_start).getTime() >= selectedStart)
        .map((event) => event.workspace),
    )
    const needle = name.toLowerCase()
    return [...names].filter((ws) => ws.toLowerCase().includes(needle)).sort()
  }, [usageQuery.data, period, name])

  const error = summariesQuery.error ?? usageQuery.error ?? skusQuery.error
  const isLoading = summariesQuery.isLoading || skusQuery.isLoading || usageQuery.isLoading

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

      {!isLoading && !error && (
        <Flex direction="column" gap="1">
          {workspaces.map((ws) => (
            <Text key={ws}>{ws}</Text>
          ))}
        </Flex>
      )}
    </Flex>
  )
}
