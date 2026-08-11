import React, { useContext, useState } from 'react'
import { Flex, Table, Text, Button, Dialog, TextField, AlertDialog } from '@radix-ui/themes'
import { PlusIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchWorkspaceMembers,
  addWorkspaceMember,
  deleteWorkspaceMember,
  WorkspaceMember,
} from '@/services/workspaceMembersService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import styles from './MembersPage.module.scss'

export const MembersPage: React.FC = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const {
    data: members,
    isLoading,
    error,
    refetch,
  } = useQuery<WorkspaceMember[]>({
    queryKey: ['WorkspaceMembers', currentWorkspace, token],
    queryFn: () => fetchWorkspaceMembers(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const handleDelete = async (member: WorkspaceMember) => {
    if (!token || !currentWorkspace) return

    setDeleteError(null)
    setDeletingUsername(member.username)
    try {
      await deleteWorkspaceMember(currentWorkspace, token, member.username)
      await refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to remove member.')
    } finally {
      setDeletingUsername(null)
    }
  }

  const handleAddMember = async () => {
    if (!token || !currentWorkspace || !newUsername.trim()) return

    setAddError(null)
    setIsAdding(true)
    try {
      await addWorkspaceMember(currentWorkspace, token, newUsername.trim())
      await refetch()
      toast.success('Member added')
      setIsAddOpen(false)
      setNewUsername('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add member.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="3">
          <Text size="7" weight="medium">
            Members
          </Text>
          <Text size="3" color="gray">
            Manage the members of this workspace
          </Text>
        </Flex>
        <Button size="3" onClick={() => setIsAddOpen(true)} disabled={!token || !currentWorkspace}>
          <PlusIcon />
          Add member
        </Button>
      </Flex>

      <Dialog.Root
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) {
            setNewUsername('')
            setAddError(null)
          }
        }}
      >
        <Dialog.Content style={{ maxWidth: 420 }}>
          <Dialog.Title>Add member</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Add a member to this workspace using their username.
          </Dialog.Description>
          <Flex direction="column" gap="3">
            <TextField.Root
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              size="3"
            />
            {addError && <Callout type="error" message={addError} />}
          </Flex>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button color="gray" variant="soft">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={() => void handleAddMember()}
              disabled={!newUsername.trim() || isAdding}
            >
              Add
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Flex direction="column" gap="5">
        {!token && <Callout type="info" message="Sign in to view workspace members." />}
        {token && !currentWorkspace && (
          <Callout type="info" message="Select a workspace to view its members." />
        )}
        {deleteError && <Callout type="error" message={deleteError} />}

        {isLoading ? (
          <LoadingIndicator size="3" />
        ) : (
          error && (
            <Callout
              type="error"
              message={error instanceof Error ? error.message : 'Failed to load members.'}
            />
          )
        )}

        {!isLoading && !error && currentWorkspace && (
          <>
            {members && members.length > 0 ? (
              <Table.Root className={styles.membersTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Username</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Remove</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {members.map((member) => (
                    <Table.Row key={member.username}>
                      <Table.Cell>
                        <Text size="2" weight="medium">
                          {member.username}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') || 'N/A'}
                      </Table.Cell>
                      <Table.Cell>{member.email ?? 'N/A'}</Table.Cell>
                      <Table.Cell>
                        <AlertDialog.Root>
                          <AlertDialog.Trigger>
                            <Button
                              size="2"
                              variant="soft"
                              color="red"
                              type="button"
                              disabled={deletingUsername === member.username}
                              aria-label={`Remove ${member.username}`}
                            >
                              Remove
                            </Button>
                          </AlertDialog.Trigger>
                          <AlertDialog.Content style={{ maxWidth: 420 }}>
                            <AlertDialog.Title>Remove member</AlertDialog.Title>
                            <AlertDialog.Description size="2">
                              Remove <strong>{member.username}</strong> from this workspace? They
                              will lose access immediately.
                            </AlertDialog.Description>
                            <Flex gap="3" mt="4" justify="end">
                              <AlertDialog.Cancel>
                                <Button variant="soft" color="gray">
                                  Cancel
                                </Button>
                              </AlertDialog.Cancel>
                              <AlertDialog.Action>
                                <Button
                                  variant="solid"
                                  color="red"
                                  onClick={() => void handleDelete(member)}
                                >
                                  Remove
                                </Button>
                              </AlertDialog.Action>
                            </Flex>
                          </AlertDialog.Content>
                        </AlertDialog.Root>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : (
              <Callout type="info" message="No members found for this workspace." />
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
