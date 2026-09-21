import React, { useContext, useMemo, useState } from 'react'
import { Badge, Button, Flex, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchPricingPolicy,
  fetchWorkspaceBalance,
  fetchWorkspaceLedger,
} from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { useSkusBySku } from '@/hooks/useSkusBySku'
import { convertDateToUTCString, formatDateToDDMMYEAR } from '@/library/dateUtils'
import styles from './CreditsPage.module.scss'

const RECENT_GRANTS_COUNT = 5
const GRANTS_PAGE_SIZE = 10
const GRANTS_FETCH_LIMIT = 100

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

  const skusBySku = useSkusBySku(token, userInfo?.sub)

  const {
    data: grants,
    isLoading: isGrantsLoading,
    error: grantsError,
  } = useQuery({
    queryKey: ['CreditGrants', currentWorkspace, userInfo?.sub],
    queryFn: () =>
      fetchWorkspaceLedger(currentWorkspace!, token!, {
        transactionType: 'grant',
        limit: GRANTS_FETCH_LIMIT,
      }),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [historyPage, setHistoryPage] = useState(0)

  // Don't rely on the ledger endpoint's own ordering for "most recent" — sort client-side so
  // this stays correct regardless of what order the API returns grants in.
  const sortedGrants = useMemo(
    () =>
      grants
        ? [...grants].sort(
            (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
          )
        : grants,
    [grants],
  )

  const balance = creditBalance ? Number(creditBalance.balance) : null
  const hasValidBalance = balance !== null && !Number.isNaN(balance)
  const isNegative = hasValidBalance && balance < 0

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

        {creditBalance && !hasValidBalance && (
          <Callout type="error" message="Received an invalid credit balance from the server." />
        )}

        {creditBalance && hasValidBalance && (
          <>
            {isNegative && (
              <Callout
                type="warning"
                message="This workspace's balance is negative — new activity may be blocked until it is topped up."
              />
            )}

            <Flex align="center" gap="3" className={styles.balanceCard}>
              <Text size="8" weight="bold">
                {balance.toFixed(2)}
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
            Credit history
          </Text>

          {grantsError && (
            <Callout
              type="error"
              message={
                grantsError instanceof Error
                  ? grantsError.message
                  : 'Failed to load credit history.'
              }
            />
          )}

          {isGrantsLoading && <LoadingIndicator size="3" />}

          {sortedGrants && sortedGrants.length === 0 && (
            <Callout type="info" message="No credit top-ups recorded for this workspace yet." />
          )}

          {sortedGrants && sortedGrants.length > 0 && (
            <>
              <Table.Root className={styles.creditsTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Reason</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(isHistoryExpanded
                    ? sortedGrants.slice(
                        historyPage * GRANTS_PAGE_SIZE,
                        (historyPage + 1) * GRANTS_PAGE_SIZE,
                      )
                    : sortedGrants.slice(0, RECENT_GRANTS_COUNT)
                  ).map((grant) => (
                    <Table.Row key={grant.uuid}>
                      <Table.Cell>{convertDateToUTCString(new Date(grant.occurred_at))}</Table.Cell>
                      <Table.Cell>
                        <Text weight="medium" color="green">
                          +{Number(grant.credits).toFixed(2)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{grant.reason ?? '—'}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              {isHistoryExpanded && sortedGrants.length > GRANTS_PAGE_SIZE && (
                <Flex justify="center" mt="2">
                  <PageSelector
                    currentPageIndex={historyPage}
                    nextDisabled={(historyPage + 1) * GRANTS_PAGE_SIZE >= sortedGrants.length}
                    onGoToPage={setHistoryPage}
                    onNextClick={() => setHistoryPage((page) => page + 1)}
                    onPreviousClick={() => setHistoryPage((page) => page - 1)}
                    pageCount={Math.ceil(sortedGrants.length / GRANTS_PAGE_SIZE)}
                    previousDisabled={historyPage === 0}
                  />
                </Flex>
              )}

              {sortedGrants.length > RECENT_GRANTS_COUNT && (
                <Flex align="center" gap="3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsHistoryExpanded((expanded) => !expanded)
                      setHistoryPage(0)
                    }}
                  >
                    {isHistoryExpanded ? 'Show less' : `View all (${sortedGrants.length})`}
                  </Button>
                  {sortedGrants.length >= GRANTS_FETCH_LIMIT && (
                    <Text size="1" color="gray">
                      Showing the most recent {GRANTS_FETCH_LIMIT} top-ups.
                    </Text>
                  )}
                </Flex>
              )}
            </>
          )}
        </Flex>

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
