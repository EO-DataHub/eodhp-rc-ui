import React, { useContext, useState } from 'react'
import { Button, Checkbox, Dialog, Flex, Table, Text, TextArea, TextField } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  Account,
  CreateAccountPayload,
  createAccount,
  fetchAccounts,
} from '@/services/accountService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import styles from '../ProfilePage/ProfilePage.module.scss'

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  denied: 'Request denied',
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.formField}>
    <Text size="2" weight="medium" as="label">
      {label}
    </Text>
    {children}
  </div>
)

const EMPTY_FORM = {
  accountName: '',
  organizationName: '',
  billingAddress: '',
  accountOpeningReason: '',
  agreeTerms: false,
}

const CreateAccountDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  accountOwner: string
}> = ({ open, onOpenChange, accountOwner }) => {
  const { token } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: CreateAccountPayload) => {
      if (!token) {
        return Promise.reject(new Error('You must be signed in to request an account.'))
      }
      return createAccount(payload, token)
    },
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(['Accounts', token], (prev) =>
        prev ? [...prev, account] : [account],
      )
      setForm(EMPTY_FORM)
      onOpenChange(false)
    },
  })

  const handleSubmit = () => {
    const { accountName, organizationName, billingAddress, accountOpeningReason, agreeTerms } = form
    if (!accountOwner.trim()) {
      setValidationError(
        'We couldn’t determine your account owner name. Please try signing out and back in, or contact support if this continues.',
      )
      return
    }
    if (
      !accountName.trim() ||
      !organizationName.trim() ||
      !billingAddress.trim() ||
      !accountOpeningReason.trim() ||
      !agreeTerms
    ) {
      setValidationError('Please complete all required fields and agree to the terms.')
      return
    }
    setValidationError(null)
    mutation.mutate({
      accountOwner,
      name: accountName.trim(),
      organizationName: organizationName.trim(),
      billingAddress: billingAddress.trim(),
      accountOpeningReason: accountOpeningReason.trim(),
    })
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setForm(EMPTY_FORM)
          setValidationError(null)
        }
        onOpenChange(next)
      }}
    >
      <Dialog.Content maxWidth="500px">
        <Dialog.Close>
          <Button
            variant="ghost"
            aria-label="Close"
            style={{ position: 'absolute', top: 15, right: 20 }}
          >
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="column" gap="4">
          <Dialog.Title>Request a billing account</Dialog.Title>

          <FormField label="Account owner">
            <TextField.Root value={accountOwner} readOnly size="2" />
          </FormField>

          <FormField label="Account name">
            <TextField.Root
              value={form.accountName}
              onChange={(e) => setForm((prev) => ({ ...prev, accountName: e.target.value }))}
              size="2"
            />
          </FormField>

          <FormField label="Organization name">
            <TextField.Root
              value={form.organizationName}
              onChange={(e) => setForm((prev) => ({ ...prev, organizationName: e.target.value }))}
              size="2"
            />
          </FormField>

          <FormField label="Billing address">
            <TextArea
              value={form.billingAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, billingAddress: e.target.value }))}
            />
          </FormField>

          <FormField label="Reason for opening an account">
            <TextArea
              value={form.accountOpeningReason}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, accountOpeningReason: e.target.value }))
              }
            />
          </FormField>

          <Flex align="center" gap="2">
            <Checkbox
              checked={form.agreeTerms}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, agreeTerms: Boolean(checked) }))
              }
            />
            <Text size="2">
              I agree to the hub terms and conditions on behalf of my organisation
            </Text>
          </Flex>

          {validationError && (
            <Text size="2" color="red">
              {validationError}
            </Text>
          )}
          {mutation.isError && (
            <Text size="2" color="red">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create account. Please try again.'}
            </Text>
          )}

          <Flex gap="2" justify="end">
            <Button color="gray" variant="soft" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={mutation.isPending} onClick={() => handleSubmit()}>
              {mutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export const AccountsPage: React.FC = () => {
  const { token, workspaceUserName } = useContext(AuthenticationContext)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['Accounts', token],
    queryFn: () => fetchAccounts(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Billing accounts
        </Text>
        <Text size="3" color="gray">
          A billing account represents the legal and billing relationship between your organisation
          and EODH. Workspaces are created under a billing account, so you&apos;ll need at least one
          approved account before you can create a workspace. New requests are reviewed by the EODH
          team — you&apos;ll be notified by email once yours is approved.
        </Text>
      </Flex>

      <Flex direction="column" gap="4">
        <Flex justify="end">
          <Button size="2" disabled={!token} onClick={() => setIsCreateOpen(true)}>
            Request new account
          </Button>
        </Flex>

        {!token && (
          <Flex justify="end">
            <Callout type="info" message="Sign in to view your accounts." />
          </Flex>
        )}

        {isLoading && <LoadingIndicator size="3" />}

        {error && (
          <Flex justify="end">
            <Callout
              type="error"
              message={error instanceof Error ? error.message : 'Failed to load accounts.'}
            />
          </Flex>
        )}

        {!isLoading && !error && token && (accounts?.length ?? 0) === 0 && (
          <Flex justify="end">
            <Callout
              type="info"
              message="You don't have a billing account yet. Request one to start creating workspaces."
            />
          </Flex>
        )}

        {!isLoading && !error && (accounts?.length ?? 0) > 0 && (
          <Table.Root className={styles.accountsTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Account owner</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Workspaces</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {accounts?.map((account: Account) => (
                <Table.Row key={account.id}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {account.name}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {ACCOUNT_STATUS_LABELS[account.status?.toLowerCase() ?? ''] ??
                      account.status ??
                      'Unknown'}
                  </Table.Cell>
                  <Table.Cell>{account.accountOwner}</Table.Cell>
                  <Table.Cell>
                    {account.workspaces?.length
                      ? account.workspaces.map((workspace) => workspace.name).join(', ')
                      : 'No workspaces'}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>

      <CreateAccountDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        accountOwner={workspaceUserName ?? ''}
      />
    </Flex>
  )
}
