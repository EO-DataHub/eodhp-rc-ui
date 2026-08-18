import React, { useContext, useState } from 'react'
import {
  Flex,
  Table,
  Text,
  Button,
  Dialog,
  TextField,
  AlertDialog,
  Badge,
  Select,
} from '@radix-ui/themes'
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
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { useMockWorkspaceRoles } from './useMockWorkspaceRoles'
import { useMockWorkspaceCategory, WorkspaceCategory } from './useMockWorkspaceCategory'
import styles from './MembersPage.module.scss'

// UI preview only — see docs/pending-backend-apis.md. No admin/owner API exists yet;
// role changes and ownership transfer below are stored in localStorage, not a real API.
const ROLE_PREVIEW_NOTE =
  '(UI preview only — role changes and ownership transfers are not saved to a real API.)'
const CATEGORY_PREVIEW_NOTE = '(UI preview only — no workspace-category API exists yet.)'

const CATEGORY_LABELS: Record<WorkspaceCategory, string> = {
  commercial: 'Commercial',
  research: 'Research',
}

export const MembersPage: React.FC = () => {
  const { token, currentWorkspace, workspaceUserName, isHubAdmin } =
    useContext(AuthenticationContext)
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferConfirmText, setTransferConfirmText] = useState('')
  const [pendingCategory, setPendingCategory] = useState<WorkspaceCategory | null>(null)

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

  const { owner, admins, toggleAdmin, transferOwnership } = useMockWorkspaceRoles(
    currentWorkspace,
    members,
    workspaceUserName,
  )
  const isCurrentUserOwner = Boolean(workspaceUserName) && owner === workspaceUserName
  const transferCandidates = members?.filter((member) => member.username !== owner) ?? []

  const { category, setWorkspaceCategory } = useMockWorkspaceCategory(currentWorkspace)

  const handleConfirmCategoryChange = () => {
    if (!pendingCategory) return
    setWorkspaceCategory(pendingCategory)
    toast.success(`Workspace category set to ${CATEGORY_LABELS[pendingCategory]} (preview only)`)
    setPendingCategory(null)
  }

  const handleTransferOwnership = () => {
    if (!transferTarget) return
    transferOwnership(transferTarget)
    toast.success(`Ownership transferred to ${transferTarget} (preview only)`)
    setIsTransferOpen(false)
    setTransferTarget(null)
    setTransferConfirmText('')
  }

  const handlePromoteToAdmin = (username: string) => {
    toggleAdmin(username)
    const toastId = toast(
      <Flex align="center" justify="between" gap="4">
        <Text size="2">Made {username} an admin (preview only)</Text>
        <Button
          size="1"
          variant="ghost"
          onClick={() => {
            toggleAdmin(username)
            toast.dismiss(toastId)
          }}
        >
          Undo
        </Button>
      </Flex>,
      { autoClose: 6000 },
    )
  }

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
        <PageHeading title="Members" subtitle="Manage the members of this workspace" />
        <Flex gap="3">
          {isCurrentUserOwner && (
            <Button
              size="3"
              variant="soft"
              color="gray"
              onClick={() => setIsTransferOpen(true)}
              disabled={transferCandidates.length === 0}
            >
              Transfer ownership
            </Button>
          )}
          <Button
            size="3"
            onClick={() => setIsAddOpen(true)}
            disabled={!token || !currentWorkspace}
          >
            <PlusIcon />
            Add member
          </Button>
        </Flex>
      </Flex>

      <Flex align="center" gap="2">
        <Text size="2" color="gray">
          Category
        </Text>
        {isHubAdmin ? (
          <Select.Root
            value={category}
            onValueChange={(value) => {
              if (value !== category) setPendingCategory(value as WorkspaceCategory)
            }}
            size="1"
          >
            <Select.Trigger variant="soft" />
            <Select.Content position="popper">
              <Select.Item value="commercial">Commercial</Select.Item>
              <Select.Item value="research">Research</Select.Item>
            </Select.Content>
          </Select.Root>
        ) : (
          <Badge color={category === 'commercial' ? 'blue' : 'green'} variant="soft">
            {CATEGORY_LABELS[category]}
          </Badge>
        )}
      </Flex>

      <AlertDialog.Root
        open={pendingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCategory(null)
        }}
      >
        <AlertDialog.Content style={{ maxWidth: 420 }}>
          <AlertDialog.Title>Change workspace category</AlertDialog.Title>
          <AlertDialog.Description size="2" mb="2">
            Set this workspace&apos;s category to{' '}
            <strong>{pendingCategory ? CATEGORY_LABELS[pendingCategory] : ''}</strong>? This affects
            pricing for future usage; past charges are unaffected.
          </AlertDialog.Description>
          <Text size="1" color="red" as="p">
            {CATEGORY_PREVIEW_NOTE}
          </Text>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" onClick={handleConfirmCategoryChange}>
                Confirm
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <Dialog.Root
        open={isTransferOpen}
        onOpenChange={(open) => {
          setIsTransferOpen(open)
          if (!open) {
            setTransferTarget(null)
            setTransferConfirmText('')
          }
        }}
      >
        <Dialog.Content style={{ maxWidth: 420 }}>
          <Dialog.Title>Transfer ownership</Dialog.Title>
          <Dialog.Description size="2" mb="2">
            The new owner becomes the protected super-admin for this workspace. You will become a
            regular admin.
          </Dialog.Description>
          <Text size="1" color="red" mb="4" as="p">
            {ROLE_PREVIEW_NOTE}
          </Text>
          <Flex direction="column" gap="3">
            <Select.Root
              value={transferTarget ?? undefined}
              onValueChange={(value) => {
                setTransferTarget(value)
                setTransferConfirmText('')
              }}
            >
              <Select.Trigger placeholder="Select a new owner" style={{ width: '100%' }} />
              <Select.Content position="popper">
                {transferCandidates.map((member) => (
                  <Select.Item key={member.username} value={member.username}>
                    {member.username}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            {transferTarget && (
              <TextField.Root
                placeholder={`Type "${transferTarget}" to confirm`}
                value={transferConfirmText}
                onChange={(e) => setTransferConfirmText(e.target.value)}
                size="3"
              />
            )}
          </Flex>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button color="gray" variant="soft">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              disabled={!transferTarget || transferConfirmText.trim() !== transferTarget}
              onClick={handleTransferOwnership}
            >
              Transfer
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

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
              <>
                <Table.Root className={styles.membersTable}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Username</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Remove</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {members.map((member) => {
                      const isOwner = member.username === owner
                      const isAdmin = admins.includes(member.username)
                      return (
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
                            {isOwner ? (
                              <Badge color="amber" variant="solid">
                                Owner
                              </Badge>
                            ) : (
                              <Select.Root
                                value={isAdmin ? 'admin' : 'member'}
                                onValueChange={(value) => {
                                  const nextIsAdmin = value === 'admin'
                                  if (nextIsAdmin === isAdmin) return
                                  if (nextIsAdmin) {
                                    handlePromoteToAdmin(member.username)
                                  } else {
                                    toggleAdmin(member.username)
                                  }
                                }}
                                size="1"
                              >
                                <Select.Trigger variant="soft" />
                                <Select.Content position="popper">
                                  <Select.Item value="member">Member</Select.Item>
                                  <Select.Item value="admin">Admin</Select.Item>
                                </Select.Content>
                              </Select.Root>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <AlertDialog.Root>
                              <AlertDialog.Trigger>
                                <Button
                                  size="2"
                                  variant="soft"
                                  color="red"
                                  type="button"
                                  disabled={isOwner || deletingUsername === member.username}
                                  aria-label={`Remove ${member.username}`}
                                >
                                  Remove
                                </Button>
                              </AlertDialog.Trigger>
                              <AlertDialog.Content style={{ maxWidth: 420 }}>
                                <AlertDialog.Title>Remove member</AlertDialog.Title>
                                <AlertDialog.Description size="2">
                                  Remove <strong>{member.username}</strong> from this workspace?
                                  They will lose access immediately.
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
                      )
                    })}
                  </Table.Body>
                </Table.Root>
                <Text size="1" color="red">
                  {ROLE_PREVIEW_NOTE}
                </Text>
              </>
            ) : (
              <Callout type="info" message="No members found for this workspace." />
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
