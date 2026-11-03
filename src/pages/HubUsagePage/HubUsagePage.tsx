import React, { useContext } from 'react'
import { Flex } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceSummaries } from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'

export const HubUsagePage: React.FC = () => {
  const { token } = useContext(AuthenticationContext)

  const { isLoading, error } = useQuery({
    queryKey: ['hubWorkspaceSummaries', token],
    queryFn: () => fetchWorkspaceSummaries(token!),
    enabled: Boolean(token),
  })

  return (
    <Flex direction="column" gap="4" p="4">
      <PageHeading title="All workspaces" badge="none" />
      {isLoading && <LoadingIndicator />}
      {error && <Callout type="error" message={error.message} />}
    </Flex>
  )
}
