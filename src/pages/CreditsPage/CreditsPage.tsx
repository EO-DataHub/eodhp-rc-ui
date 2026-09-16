import React, { useContext, useMemo } from 'react'
import { Badge, Flex, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchPricingPolicy, fetchSkus, fetchWorkspaceBalance } from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { formatDateToDDMMYEAR } from '@/library/dateUtils'
import styles from './CreditsPage.module.scss'

export const CreditsPage: React.FC = () => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)

  const {
    data: creditBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useQuery({
    queryKey: ['CreditBalance', currentWorkspace, userInfo?.sub],
    queryFn: () => fetchWorkspaceBalance(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const {
    data: pricingPolicy,
    isLoading: isPolicyLoading,
    error: policyError,
  } = useQuery({
    queryKey: ['PricingPolicy', userInfo?.sub],
    queryFn: () => fetchPricingPolicy(token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const { data: skus } = useQuery({
    queryKey: ['BillingSkus', userInfo?.sub],
    queryFn: () => fetchSkus(token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const skusBySku = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>()
    skus?.forEach((sku) => map.set(sku.sku, { name: sku.name, unit: sku.unit }))
    return map
  }, [skus])

  const balance = creditBalance ? Number(creditBalance.balance) : null
  const isNegative = balance !== null && balance < 0

  const formatUnitsPerCredit = (creditsPerUnit: string) => {
    const rate = Number(creditsPerUnit)
    if (!rate) return '—'
    return (1 / rate).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading
        title="Credits"
        subtitle="Shared compute credit balance for this workspace, used for CPU, memory, and GPU."
      />

      <Flex direction="column" gap="5">
        {!token && <Callout type="info" message="Sign in to view credit balance." />}

        {token && !currentWorkspace && (
          <Callout type="info" message="Select a workspace to view its credit balance." />
        )}

        {balanceError && (
          <Callout
            type="error"
            message={
              balanceError instanceof Error
                ? balanceError.message
                : 'Failed to load credit balance.'
            }
          />
        )}

        {isBalanceLoading && <LoadingIndicator size="3" />}

        {creditBalance && (
          <>
            {isNegative && (
              <Callout
                type="warning"
                message="This workspace's balance is negative — new activity may be blocked until it is topped up."
              />
            )}

            <Flex align="center" gap="3" className={styles.balanceCard}>
              <Text size="8" weight="bold">
                {creditBalance.balance}
              </Text>
              <Flex direction="column">
                <Text size="2" weight="medium">
                  credits
                </Text>
                {isNegative && (
                  <Badge color="red" variant="soft">
                    Negative
                  </Badge>
                )}
              </Flex>
            </Flex>

            <Text size="1" color="gray">
              As of {formatDateToDDMMYEAR(creditBalance.as_of)}
            </Text>
          </>
        )}

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Credit rates
          </Text>

          {policyError && (
            <Callout
              type="error"
              message={policyError instanceof Error ? policyError.message : 'Failed to load rates.'}
            />
          )}

          {isPolicyLoading && <LoadingIndicator size="3" />}

          {pricingPolicy && (
            <>
              <Table.Root className={styles.creditsTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Credits per unit</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Unit per credit</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pricingPolicy.rates.map((rate) => {
                    const sku = skusBySku.get(rate.sku)
                    return (
                      <Table.Row key={rate.sku}>
                        <Table.Cell>
                          <Text size="2" weight="medium">
                            {sku?.name ?? rate.sku}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          {rate.credits_per_unit} / {sku?.unit ?? 'unit'}
                        </Table.Cell>
                        <Table.Cell>
                          {formatUnitsPerCredit(rate.credits_per_unit)} {sku?.unit ?? 'unit'}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
              <Text size="1" color="gray">
                Base rates shown, before any workspace category multiplier — there is currently no
                way to look up which category this workspace is priced under.
              </Text>
            </>
          )}
        </Flex>

        <Callout
          type="info"
          message="Buying more credits isn't self-service yet — contact the EODH team to top up this workspace's balance."
        />
      </Flex>
    </Flex>
  )
}
