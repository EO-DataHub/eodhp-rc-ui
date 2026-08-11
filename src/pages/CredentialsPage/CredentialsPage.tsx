import React, { useContext, useState } from 'react'
import {
  Flex,
  Table,
  Text,
  Button,
  Dialog,
  TextField,
  IconButton,
  AlertDialog,
} from '@radix-ui/themes'
import { PlusIcon, CopyIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  listDataHubTokens,
  createDataHubToken,
  deleteDataHubToken,
  DataHubToken,
} from '@/services/dataHubTokenService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { formatFileDateTime } from '@/library/fileUtils'
import styles from './CredentialsPage.module.scss'

const DEFAULT_EXPIRES_DAYS = 30

export const CredentialsPage: React.FC = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTokenName, setNewTokenName] = useState('API Token')
  const [expiresDays, setExpiresDays] = useState(String(DEFAULT_EXPIRES_DAYS))
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdToken, setCreatedToken] = useState<DataHubToken | null>(null)

  const {
    data: tokens,
    isLoading,
    error,
    refetch,
  } = useQuery<DataHubToken[]>({
    queryKey: ['DataHubTokens', currentWorkspace, token],
    queryFn: () => listDataHubTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const resetCreateDialog = () => {
    setIsCreateOpen(false)
    setNewTokenName('API Token')
    setExpiresDays(String(DEFAULT_EXPIRES_DAYS))
    setCreateError(null)
    setCreatedToken(null)
  }

  const handleCreateToken = async () => {
    if (!token || !currentWorkspace || !newTokenName.trim()) return

    setCreateError(null)
    setIsCreating(true)
    try {
      const result = await createDataHubToken(
        currentWorkspace,
        token,
        newTokenName.trim(),
        Number(expiresDays),
      )
      setCreatedToken(result)
      await refetch()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create token.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (dataHubToken: DataHubToken) => {
    if (!token || !currentWorkspace) return

    setDeleteError(null)
    setDeletingTokenId(dataHubToken.id)
    try {
      await deleteDataHubToken(currentWorkspace, token, dataHubToken.id)
      await refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete token.')
    } finally {
      setDeletingTokenId(null)
    }
  }

  const handleCopyToken = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="3">
          <Text size="7" weight="medium">
            Credentials
          </Text>
          <Text size="3" color="gray">
            Manage DataHub API tokens for this workspace
          </Text>
        </Flex>
        <Button
          size="3"
          onClick={() => setIsCreateOpen(true)}
          disabled={!token || !currentWorkspace}
        >
          <PlusIcon />
          Create token
        </Button>
      </Flex>

      <Dialog.Root
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetCreateDialog()
          } else {
            setIsCreateOpen(true)
          }
        }}
      >
        <Dialog.Content style={{ maxWidth: 460 }}>
          {createdToken ? (
            <>
              <Dialog.Title>Token created</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                This is your only chance to copy the API key — it will not be shown again.
              </Dialog.Description>
              <Flex direction="column" gap="3">
                <Text size="2" weight="medium">
                  Token ID: {createdToken.id}
                </Text>
                <Flex align="center" gap="2">
                  <TextField.Root
                    value={createdToken.token ?? ''}
                    readOnly
                    size="3"
                    style={{ flexGrow: 1 }}
                  />
                  <IconButton
                    size="3"
                    variant="soft"
                    aria-label="Copy API key"
                    onClick={() => void handleCopyToken(createdToken.token ?? '')}
                  >
                    <CopyIcon />
                  </IconButton>
                </Flex>
              </Flex>
              <Flex justify="end" gap="3" mt="4">
                <Button onClick={resetCreateDialog}>Dismiss</Button>
              </Flex>
            </>
          ) : (
            <>
              <Dialog.Title>Create token</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                You will need an API key to securely connect to your workspace using external tools
                or services.
              </Dialog.Description>
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Name
                  </Text>
                  <TextField.Root
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    size="3"
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Expires (days)
                  </Text>
                  <TextField.Root
                    type="number"
                    min={1}
                    max={30}
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(e.target.value)}
                    size="3"
                  />
                </label>
                {createError && <Callout type="error" message={createError} />}
              </Flex>
              <Flex justify="end" gap="3" mt="4">
                <Dialog.Close>
                  <Button color="gray" variant="soft">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  onClick={() => void handleCreateToken()}
                  disabled={!newTokenName.trim() || !expiresDays || isCreating}
                >
                  Create
                </Button>
              </Flex>
            </>
          )}
        </Dialog.Content>
      </Dialog.Root>

      <Flex direction="column" gap="5">
        {!token && <Callout type="info" message="Sign in to view workspace credentials." />}
        {token && !currentWorkspace && (
          <Callout type="info" message="Select a workspace to view its credentials." />
        )}
        {deleteError && <Callout type="error" message={deleteError} />}

        {isLoading ? (
          <LoadingIndicator size="3" />
        ) : (
          error && (
            <Callout
              type="error"
              message={error instanceof Error ? error.message : 'Failed to load tokens.'}
            />
          )
        )}

        {!isLoading && !error && currentWorkspace && (
          <>
            {tokens && tokens.length > 0 ? (
              <Table.Root className={styles.tokensTable}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Scope</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Expiry</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Delete</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tokens.map((dataHubToken) => (
                    <Table.Row key={dataHubToken.id}>
                      <Table.Cell>
                        <Text size="2" weight="medium">
                          {dataHubToken.name}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{dataHubToken.scope ?? 'N/A'}</Table.Cell>
                      <Table.Cell>{formatFileDateTime(dataHubToken.created)}</Table.Cell>
                      <Table.Cell>{formatFileDateTime(dataHubToken.expiry)}</Table.Cell>
                      <Table.Cell>
                        <AlertDialog.Root>
                          <AlertDialog.Trigger>
                            <Button
                              size="2"
                              variant="soft"
                              color="red"
                              type="button"
                              disabled={deletingTokenId === dataHubToken.id}
                              aria-label={`Delete ${dataHubToken.name}`}
                            >
                              Delete
                            </Button>
                          </AlertDialog.Trigger>
                          <AlertDialog.Content style={{ maxWidth: 420 }}>
                            <AlertDialog.Title>Delete token</AlertDialog.Title>
                            <AlertDialog.Description size="2">
                              Delete <strong>{dataHubToken.name}</strong>? Anything using this API
                              key will stop working immediately.
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
                                  onClick={() => void handleDelete(dataHubToken)}
                                >
                                  Delete
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
              <Callout
                type="info"
                message="You do not currently have any active tokens. Click Create token to make one."
              />
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
