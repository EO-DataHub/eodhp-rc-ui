import React, { useContext, useState } from 'react'
import { AlertDialog, Button, Dialog, Flex, Table, Text, TextField } from '@radix-ui/themes'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  WorkspaceMember,
  addWorkspaceMember,
  deleteWorkspaceMember,
  fetchWorkspaceMembers,
} from '@/services/workspaceMembersService'
import { fetchAccounts } from '@/services/accountService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { FormField } from '@/components/FormField/FormField'
import styles from './MembersPage.module.scss'

const AddMemberDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
}> = ({ open, onOpenChange }) => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')

  const mutation = useMutation({
    mutationFn: (username: string) => {
      if (!token || !currentWorkspace) {
        return Promise.reject(
          new Error('You must be signed in with a workspace selected to add a member.'),
        )
      }
      return addWorkspaceMember(currentWorkspace, token, username)
    },
    onSuccess: (_data, username) => {
      queryClient.setQueryData<WorkspaceMember[]>(
        ['WorkspaceMembers', currentWorkspace, userInfo?.sub],
        (prev) => (prev ? [...prev, { username }] : [{ username }]),
      )
      setUsername('')
      onOpenChange(false)
    },
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setUsername('')
        }
        onOpenChange(next)
      }}
    >
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Add member</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Add a member to this workspace using their username.
        </Dialog.Description>
        <Flex direction="column" gap="3">
          <FormField label="Username">
            <TextField.Root
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="2"
            />
          </FormField>

          {mutation.isError && (
            <Callout
              type="error"
              message={
                mutation.error instanceof Error ? mutation.error.message : 'Failed to add member.'
              }
            />
          )}
        </Flex>

        <Flex gap="2" justify="end" mt="4">
          <Dialog.Close>
            <Button color="gray" variant="soft">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            disabled={!username.trim() || mutation.isPending}
            onClick={() => mutation.mutate(username.trim())}
          >
            {mutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export const MembersPage: React.FC = () => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)

  const {
    data: members,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['WorkspaceMembers', currentWorkspace, userInfo?.sub],
    queryFn: () => fetchWorkspaceMembers(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const { data: accounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['Accounts', userInfo?.sub],
    queryFn: () => fetchAccounts(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  // Mirrors the real `mustBeAccountOwner` check the backend enforces on
  // add/remove-member calls: only the owner of the billing account this
  // workspace belongs to may manage its members.
  const canManageMembers = Boolean(
    accounts?.some((account) => account.workspaces?.some((ws) => ws.name === currentWorkspace)),
  )

  const deleteMutation = useMutation({
    mutationFn: (username: string) => {
      if (!token || !currentWorkspace) {
        return Promise.reject(
          new Error('You must be signed in with a workspace selected to remove a member.'),
        )
      }
      return deleteWorkspaceMember(currentWorkspace, token, username)
    },
    onSuccess: (_data, username) => {
      queryClient.setQueryData<WorkspaceMember[]>(
        ['WorkspaceMembers', currentWorkspace, userInfo?.sub],
        (prev) => prev?.filter((member) => member.username !== username),
      )
    },
  })

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Members
        </Text>
        <Text size="3" color="gray">
          Manage who has access to this workspace.
        </Text>
      </Flex>

      <Flex direction="column" gap="4">
        {canManageMembers && (
          <Flex justify="end">
            <Button size="2" onClick={() => setIsAddOpen(true)}>
              Add member
            </Button>
          </Flex>
        )}

        {!token && (
          <Flex justify="end">
            <Callout type="info" message="Sign in to view workspace members." />
          </Flex>
        )}

        {token && !currentWorkspace && (
          <Flex justify="end">
            <Callout type="info" message="Select a workspace to view its members." />
          </Flex>
        )}

        {token && currentWorkspace && !isAccountsLoading && !canManageMembers && (
          <Flex justify="end">
            <Callout
              type="info"
              message="Only the owner of this workspace's billing account can add or remove members."
            />
          </Flex>
        )}

        {deleteMutation.isError && (
          <Flex justify="end">
            <Callout
              type="error"
              message={
                deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Failed to remove member.'
              }
            />
          </Flex>
        )}

        {isLoading && <LoadingIndicator size="3" />}

        {error && (
          <Flex justify="end">
            <Callout
              type="error"
              message={error instanceof Error ? error.message : 'Failed to load members.'}
            />
          </Flex>
        )}

        {!isLoading && !error && currentWorkspace && (members?.length ?? 0) === 0 && (
          <Flex justify="end">
            <Callout type="info" message="No members found for this workspace." />
          </Flex>
        )}

        {!isLoading && !error && (members?.length ?? 0) > 0 && (
          <Table.Root className={styles.dataTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Username</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                {canManageMembers && <Table.ColumnHeaderCell>Remove</Table.ColumnHeaderCell>}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {members?.map((member) => (
                <Table.Row key={member.username}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {member.username}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}
                  </Table.Cell>
                  <Table.Cell>{member.email ?? '—'}</Table.Cell>
                  {canManageMembers && (
                    <Table.Cell>
                      <AlertDialog.Root>
                        <AlertDialog.Trigger>
                          <Button
                            size="1"
                            variant="soft"
                            color="red"
                            disabled={
                              deleteMutation.isPending &&
                              deleteMutation.variables === member.username
                            }
                            aria-label={`Remove ${member.username}`}
                          >
                            Remove
                          </Button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content maxWidth="420px">
                          <AlertDialog.Title>Remove member</AlertDialog.Title>
                          <AlertDialog.Description size="2">
                            Remove <strong>{member.username}</strong> from this workspace? They will
                            lose access immediately.
                          </AlertDialog.Description>
                          <Flex gap="2" mt="4" justify="end">
                            <AlertDialog.Cancel>
                              <Button variant="soft" color="gray">
                                Cancel
                              </Button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action>
                              <Button
                                variant="solid"
                                color="red"
                                onClick={() => deleteMutation.mutate(member.username)}
                              >
                                Remove
                              </Button>
                            </AlertDialog.Action>
                          </Flex>
                        </AlertDialog.Content>
                      </AlertDialog.Root>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>

      <AddMemberDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </Flex>
  )
}
