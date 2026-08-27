import React, { useContext, useMemo, useState } from 'react'
import { Button, Dialog, Flex, Select, Table, Text, TextField } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  CreateWorkspacePayload,
  Workspace,
  createWorkspace,
  fetchWorkspaces,
} from '@/services/workspaceTokenService'
import { fetchAccounts } from '@/services/accountService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { FormField } from '@/components/FormField/FormField'
import styles from '../ProfilePage/ProfilePage.module.scss'

const isDnsCompliant = (name: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)

const EMPTY_FORM = {
  name: '',
  account: '',
}

const CreateWorkspaceDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  approvedAccounts: { id: string; name: string }[]
}> = ({ open, onOpenChange, approvedAccounts }) => {
  const { token } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => {
      if (!token) {
        return Promise.reject(new Error('You must be signed in to create a workspace.'))
      }
      return createWorkspace(payload, token)
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData<Workspace[]>(['Workspaces', token], (prev) =>
        prev ? [...prev, workspace] : [workspace],
      )
      setForm(EMPTY_FORM)
      onOpenChange(false)
    },
  })

  const handleSubmit = () => {
    const name = form.name.trim()
    if (!name || !form.account) {
      setValidationError('Please enter a name and choose an account.')
      return
    }
    if (name.length < 3 || name.length > 50) {
      setValidationError('Name must be between 3 and 50 characters.')
      return
    }
    if (!isDnsCompliant(name)) {
      setValidationError(
        'Invalid name: only lowercase letters, numbers, and hyphens are allowed, and it can’t start or end with a hyphen.',
      )
      return
    }
    setValidationError(null)
    mutation.mutate({ name, account: form.account })
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
          <Dialog.Title>Create workspace</Dialog.Title>

          <FormField label="Name">
            <TextField.Root
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              size="2"
            />
          </FormField>

          <FormField label="Account">
            <Select.Root
              size="2"
              value={form.account || undefined}
              onValueChange={(account) => setForm((prev) => ({ ...prev, account }))}
            >
              <Select.Trigger placeholder="Choose an approved account" style={{ width: '100%' }} />
              <Select.Content position="popper">
                {approvedAccounts.map((account) => (
                  <Select.Item key={account.id} value={account.id}>
                    {account.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </FormField>

          {validationError && (
            <Text size="2" color="red">
              {validationError}
            </Text>
          )}
          {mutation.isError && (
            <Text size="2" color="red">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create workspace. Please try again.'}
            </Text>
          )}

          <Flex gap="2" justify="end">
            <Button color="gray" variant="soft" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={mutation.isPending} onClick={() => handleSubmit()}>
              {mutation.isPending ? 'Creating…' : 'Create workspace'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export const WorkspacesPage: React.FC = () => {
  const { token } = useContext(AuthenticationContext)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const {
    data: workspaces,
    isLoading: isWorkspacesLoading,
    error,
  } = useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const { data: accounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['Accounts', token],
    queryFn: () => fetchAccounts(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const accountNameById = useMemo(
    () => Object.fromEntries((accounts ?? []).map((account) => [account.id, account.name])),
    [accounts],
  )

  const approvedAccounts = useMemo(
    () =>
      (accounts ?? [])
        .filter((account) => account.status?.toLowerCase() === 'approved')
        .map((account) => ({ id: account.id, name: account.name })),
    [accounts],
  )

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Workspaces
        </Text>
        <Text size="3" color="gray">
          Workspaces are where your data, workflows, and results are stored and processed on the
          Hub. Each workspace belongs to one of your approved billing accounts.
        </Text>
      </Flex>

      <Flex direction="column" gap="4">
        <Flex justify="end">
          <Button
            size="2"
            disabled={!token || isAccountsLoading || approvedAccounts.length === 0}
            onClick={() => setIsCreateOpen(true)}
          >
            Create workspace
          </Button>
        </Flex>

        {!token && (
          <Flex justify="end">
            <Callout type="info" message="Sign in to view your workspaces." />
          </Flex>
        )}

        {token && !isAccountsLoading && approvedAccounts.length === 0 && (
          <Flex justify="end">
            <Callout
              type="info"
              message="You need an approved billing account before you can create a workspace — request one on the Accounts page."
            />
          </Flex>
        )}

        {(isWorkspacesLoading || isAccountsLoading) && <LoadingIndicator size="3" />}

        {error && (
          <Flex justify="end">
            <Callout
              type="error"
              message={error instanceof Error ? error.message : 'Failed to load workspaces.'}
            />
          </Flex>
        )}

        {!isWorkspacesLoading &&
          !isAccountsLoading &&
          !error &&
          token &&
          (workspaces?.length ?? 0) === 0 && (
            <Flex justify="end">
              <Callout type="info" message="You don't have any workspaces yet." />
            </Flex>
          )}

        {!isWorkspacesLoading && !isAccountsLoading && !error && (workspaces?.length ?? 0) > 0 && (
          <Table.Root className={styles.dataTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Account</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {workspaces?.map((workspace: Workspace) => (
                <Table.Row key={workspace.id}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {workspace.name}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{accountNameById[workspace.account] ?? workspace.account}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>

      <CreateWorkspaceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        approvedAccounts={approvedAccounts}
      />
    </Flex>
  )
}
