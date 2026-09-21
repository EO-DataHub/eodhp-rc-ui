import React, { useContext } from 'react'
import { Flex, Table, Text } from '@radix-ui/themes'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchAccount, getAccountStatusLabel } from '@/services/accountService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { formatDateToDDMMYEAR } from '@/library/dateUtils'
import styles from '../ProfilePage/ProfilePage.module.scss'

export const AccountDetailPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>()
  const { token, userInfo } = useContext(AuthenticationContext)

  const {
    data: account,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['Account', accountId, userInfo?.sub],
    queryFn: () => fetchAccount(accountId!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && accountId),
  })

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <Link to="/profile/accounts">← Back to billing accounts</Link>

      {isLoading && <LoadingIndicator size="3" />}

      {error && (
        <Callout
          type="error"
          message={error instanceof Error ? error.message : 'Failed to load account.'}
        />
      )}

      {account && (
        <>
          <PageHeading title={account.name} subtitle={account.organizationName} badge="none" />

          <Table.Root className={styles.dataTable}>
            <Table.Body>
              <Table.Row>
                <Table.RowHeaderCell>Status</Table.RowHeaderCell>
                <Table.Cell>{getAccountStatusLabel(account.status)}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.RowHeaderCell>Account owner</Table.RowHeaderCell>
                <Table.Cell>{account.accountOwner}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.RowHeaderCell>Billing address</Table.RowHeaderCell>
                <Table.Cell>{account.billingAddress}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.RowHeaderCell>Reason for opening</Table.RowHeaderCell>
                <Table.Cell>{account.accountOpeningReason}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.RowHeaderCell>Created</Table.RowHeaderCell>
                <Table.Cell>{formatDateToDDMMYEAR(account.createdAt)}</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>

          <Flex direction="column" gap="2">
            <Text size="4" weight="medium">
              Workspaces
            </Text>
            {account.workspaces?.length ? (
              <Table.Root className={styles.dataTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {account.workspaces.map((workspace) => (
                    <Table.Row key={workspace.id}>
                      <Table.Cell>{workspace.name}</Table.Cell>
                      <Table.Cell>{workspace.status ?? '—'}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : (
              <Callout type="info" message="This account has no workspaces yet." />
            )}
          </Flex>
        </>
      )}
    </Flex>
  )
}
