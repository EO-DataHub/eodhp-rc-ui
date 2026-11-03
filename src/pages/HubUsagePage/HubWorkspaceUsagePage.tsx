import React, { useContext } from 'react'
import { Flex } from '@radix-ui/themes'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceSummaries } from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { PeriodControls } from './PeriodControls'
import { useHubUsageSearchParams } from './useHubUsageSearchParams'

export const HubWorkspaceUsagePage: React.FC = () => {
  const { token } = useContext(AuthenticationContext)
  const { workspace = '' } = useParams<{ workspace: string }>()
  const state = useHubUsageSearchParams()

  const { isLoading, error } = useQuery({
    queryKey: ['hubWorkspaceSummaries', token],
    queryFn: () => fetchWorkspaceSummaries(token!),
    enabled: Boolean(token),
  })

  return (
    <Flex direction="column" gap="4" p="4">
      <PageHeading title={workspace} badge="none" />
      <PeriodControls
        periodType={state.periodType}
        period={state.period}
        inProgress={state.inProgress}
        onPeriodTypeChange={state.setPeriodType}
        onStep={state.stepPeriod}
        onSelectDate={state.selectDate}
      />
      {isLoading && <LoadingIndicator />}
      {error && <Callout type="error" message={error.message} />}
    </Flex>
  )
}
