import React, { useContext, useState } from 'react'
import {
  AlertDialog,
  Badge,
  Button,
  Dialog,
  Flex,
  Select,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  WorkspaceMember,
  addWorkspaceMember,
  deleteWorkspaceMember,
  fetchWorkspaceAdmins,
  fetchWorkspaceMembers,
  grantWorkspaceAdmin,
  revokeWorkspaceAdmin,
} from '@/services/workspaceMembersService'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { FormField } from '@/components/FormField/FormField'
import { PageHeading } from '@/components/PageHeading/PageHeading'
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

interface PendingRoleChange {
  username: string
  action: 'grant' | 'revoke'
}

export const MembersPage: React.FC = () => {
  const { token, currentWorkspace, userInfo, workspaceUserName } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null)

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

  const { data: workspaces, isLoading: isWorkspacesLoading } = useQuery({
    queryKey: ['Workspaces', userInfo?.sub],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const { data: admins, isLoading: isAdminsLoading } = useQuery({
    queryKey: ['WorkspaceAdmins', currentWorkspace, userInfo?.sub],
    queryFn: () => fetchWorkspaceAdmins(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const accountOwner = workspaces?.find((workspace) => workspace.name === currentWorkspace)?.owner

  // The account owner is always an implicit admin on every workspace they
  // own; explicit workspace admins are tracked separately by the backend
  // and never include the owner.
  const isAccountOwner = Boolean(workspaceUserName && workspaceUserName === accountOwner)
  const isWorkspaceAdmin = Boolean(workspaceUserName && admins?.includes(workspaceUserName))
  const canManageMembers = isAccountOwner || isWorkspaceAdmin
  const isRolesLoading = isWorkspacesLoading || isAdminsLoading

  // Each mutation's variables carry the workspace/user identifiers the call
  // was made for, and onSuccess writes into the cache using those instead of
  // the render-scope currentWorkspace/userInfo. React Query rebinds a
  // mutation's onSuccess to the latest render's closure, so reading
  // currentWorkspace there directly would apply the result to whichever
  // workspace happens to be selected when the request settles, not the one
  // it was actually made for.
  const deleteMutation = useMutation({
    mutationFn: ({
      username,
      workspace,
      authToken,
    }: {
      username: string
      workspace: string
      authToken: string
      userId?: string
    }) => deleteWorkspaceMember(workspace, authToken, username),
    onSuccess: (_data, { username, workspace, userId }) => {
      queryClient.setQueryData<WorkspaceMember[]>(['WorkspaceMembers', workspace, userId], (prev) =>
        prev?.filter((member) => member.username !== username),
      )
      queryClient.setQueryData<string[]>(['WorkspaceAdmins', workspace, userId], (prev) =>
        prev?.filter((admin) => admin !== username),
      )
    },
  })

  const grantAdminMutation = useMutation({
    mutationFn: ({
      username,
      workspace,
      authToken,
    }: {
      username: string
      workspace: string
      authToken: string
      userId?: string
    }) => grantWorkspaceAdmin(workspace, authToken, username),
    onSuccess: (_data, { username, workspace, userId }) => {
      queryClient.setQueryData<string[]>(['WorkspaceAdmins', workspace, userId], (prev) =>
        prev?.includes(username) ? prev : [...(prev ?? []), username],
      )
    },
  })

  const revokeAdminMutation = useMutation({
    mutationFn: ({
      username,
      workspace,
      authToken,
    }: {
      username: string
      workspace: string
      authToken: string
      userId?: string
    }) => revokeWorkspaceAdmin(workspace, authToken, username),
    onSuccess: (_data, { username, workspace, userId }) => {
      queryClient.setQueryData<string[]>(['WorkspaceAdmins', workspace, userId], (prev) =>
        prev?.filter((admin) => admin !== username),
      )
    },
  })

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <PageHeading title="Members" subtitle="Manage who has access to this workspace." />

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

        {token && currentWorkspace && !isRolesLoading && !canManageMembers && (
          <Flex justify="end">
            <Callout
              type="info"
              message="Only the workspace owner or an admin can add or remove members."
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

        {grantAdminMutation.isError && (
          <Flex justify="end">
            <Callout
              type="error"
              message={
                grantAdminMutation.error instanceof Error
                  ? grantAdminMutation.error.message
                  : 'Failed to grant admin status.'
              }
            />
          </Flex>
        )}

        {revokeAdminMutation.isError && (
          <Flex justify="end">
            <Callout
              type="error"
              message={
                revokeAdminMutation.error instanceof Error
                  ? revokeAdminMutation.error.message
                  : 'Failed to revoke admin status.'
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
                <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                {canManageMembers && <Table.ColumnHeaderCell>Remove</Table.ColumnHeaderCell>}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {members?.map((member) => {
                const isMemberOwner = member.username === accountOwner
                const isMemberAdmin = admins?.includes(member.username) ?? false

                return (
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
                    <Table.Cell>
                      {isMemberOwner ? (
                        <Badge color="amber">Owner</Badge>
                      ) : canManageMembers ? (
                        <Select.Root
                          size="1"
                          value={isMemberAdmin ? 'admin' : 'member'}
                          disabled={
                            (grantAdminMutation.isPending &&
                              grantAdminMutation.variables?.username === member.username) ||
                            (revokeAdminMutation.isPending &&
                              revokeAdminMutation.variables?.username === member.username)
                          }
                          onValueChange={(value) => {
                            setPendingRoleChange({
                              username: member.username,
                              action: value === 'admin' ? 'grant' : 'revoke',
                            })
                          }}
                        >
                          <Select.Trigger
                            aria-label={`Role for ${member.username}`}
                            color={isMemberAdmin ? 'blue' : 'gray'}
                            variant="soft"
                          />
                          <Select.Content>
                            <Select.Item value="member">Member</Select.Item>
                            <Select.Item value="admin">Admin</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      ) : (
                        <Text size="2">{isMemberAdmin ? 'Admin' : 'Member'}</Text>
                      )}
                    </Table.Cell>
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
                                deleteMutation.variables?.username === member.username
                              }
                              aria-label={`Remove ${member.username}`}
                            >
                              Remove
                            </Button>
                          </AlertDialog.Trigger>
                          <AlertDialog.Content maxWidth="420px">
                            <AlertDialog.Title>Remove member</AlertDialog.Title>
                            <AlertDialog.Description size="2">
                              Remove <strong>{member.username}</strong> from this workspace? They
                              will lose access immediately.
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
                                  onClick={() => {
                                    if (!token || !currentWorkspace) return
                                    deleteMutation.mutate({
                                      username: member.username,
                                      workspace: currentWorkspace,
                                      authToken: token,
                                      userId: userInfo?.sub,
                                    })
                                  }}
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
                )
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>

      <AddMemberDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <AlertDialog.Root
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoleChange(null)
        }}
      >
        <AlertDialog.Content maxWidth="420px">
          <AlertDialog.Title>
            {pendingRoleChange?.action === 'grant' ? 'Grant admin status' : 'Revoke admin status'}
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {pendingRoleChange?.action === 'grant' ? (
              <>
                Grant <strong>{pendingRoleChange.username}</strong> admin status? They will be able
                to add and remove members and manage this workspace like an owner.
              </>
            ) : (
              <>
                Revoke admin status from <strong>{pendingRoleChange?.username}</strong>? They will
                lose admin access to this workspace.
              </>
            )}
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
                color={pendingRoleChange?.action === 'grant' ? undefined : 'red'}
                onClick={() => {
                  if (!pendingRoleChange || !token || !currentWorkspace) return
                  const variables = {
                    username: pendingRoleChange.username,
                    workspace: currentWorkspace,
                    authToken: token,
                    userId: userInfo?.sub,
                  }
                  if (pendingRoleChange.action === 'grant') {
                    grantAdminMutation.mutate(variables)
                  } else {
                    revokeAdminMutation.mutate(variables)
                  }
                }}
              >
                {pendingRoleChange?.action === 'grant' ? 'Grant admin' : 'Revoke admin'}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  )
}
