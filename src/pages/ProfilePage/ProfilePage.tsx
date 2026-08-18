import React, { useContext, useState } from 'react'
import { Box, Button, Dialog, Flex, Text, TextField } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { getMockWorkspaceOwner } from '@/pages/MembersPage/useMockWorkspaceRoles'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from './ProfilePage.module.scss'

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM
const KEYCLOAK_ACCOUNT_BASE_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/account`
const KEYCLOAK_LINKED_ACCOUNTS_URL = `${KEYCLOAK_ACCOUNT_BASE_URL}/account-security/linked-accounts`

export const ProfilePage: React.FC = () => {
  const { token, workspaceUserName } = useContext(AuthenticationContext)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  // Mock ownership check (see docs/pending-backend-apis.md) — no real account-deletion
  // API exists yet, so this reads the same per-workspace localStorage roles the Members
  // page writes to. A workspace whose Members page has never been visited has no stored
  // owner and is treated as not-owned, since there's no data to block on.
  const ownedWorkspaces = (workspaces ?? []).filter(
    (workspace) => getMockWorkspaceOwner(workspace.name) === workspaceUserName,
  )
  const canDelete = !isLoading && ownedWorkspaces.length === 0

  const handleDelete = () => {
    toast.success('Account deleted (UI preview only — nothing was actually deleted).')
    setIsDeleteOpen(false)
    setConfirmText('')
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading title="Profile" subtitle="Manage your EODH account" hideWorkspace />

      <Flex direction="column" gap="3">
        <Text size="4" weight="medium">
          Account details
        </Text>
        <Text size="2" color="gray">
          Change your name or email address on your EO Data Hub account page (opens in a new tab).
        </Text>
        <Box>
          <Button variant="soft" asChild>
            <a href={KEYCLOAK_ACCOUNT_BASE_URL} target="_blank" rel="noreferrer">
              Manage account details
            </a>
          </Button>
        </Box>
      </Flex>

      <Flex direction="column" gap="3">
        <Text size="4" weight="medium">
          Identity providers
        </Text>
        <Text size="2" color="gray">
          Link or unlink GitHub, Google or Microsoft sign-in on your EO Data Hub account page (opens
          in a new tab).
        </Text>
        <Box>
          <Button variant="soft" asChild>
            <a href={KEYCLOAK_LINKED_ACCOUNTS_URL} target="_blank" rel="noreferrer">
              Manage identity providers
            </a>
          </Button>
        </Box>
      </Flex>

      <Flex direction="column" gap="3" className={styles.dangerZone}>
        <Text size="4" weight="medium" color="red">
          Danger zone
        </Text>

        {isLoading ? (
          <LoadingIndicator size="2" />
        ) : (
          ownedWorkspaces.length > 0 && (
            <Callout
              type="warning"
              message={`You're the owner of ${ownedWorkspaces.length} workspace${
                ownedWorkspaces.length === 1 ? '' : 's'
              } (${ownedWorkspaces
                .map((workspace) => workspace.name)
                .join(
                  ', ',
                )}). Transfer ownership to someone else on each workspace's Members page before deleting your account.`}
            />
          )
        )}

        <Box>
          <Dialog.Root
            open={isDeleteOpen}
            onOpenChange={(open) => {
              setIsDeleteOpen(open)
              if (!open) setConfirmText('')
            }}
          >
            <Dialog.Trigger>
              <Button color="red" variant="soft" disabled={!canDelete}>
                Delete my account
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 420 }}>
              <Dialog.Title>Delete account</Dialog.Title>
              <Dialog.Description size="2" mb="2">
                This permanently deletes your EODH account. This cannot be undone.
              </Dialog.Description>
              <Text size="1" color="red" mb="4" as="p">
                (UI preview only — no account-deletion API exists yet; nothing will actually be
                deleted.)
              </Text>
              <TextField.Root
                placeholder={`Type "${workspaceUserName}" to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                size="3"
              />
              <Flex justify="end" gap="3" mt="4">
                <Dialog.Close>
                  <Button color="gray" variant="soft">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  color="red"
                  disabled={confirmText.trim() !== workspaceUserName}
                  onClick={handleDelete}
                >
                  Delete account
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Box>
        <Text size="1" color="red">
          (UI preview only — no account-deletion API exists yet; nothing is actually deleted.)
        </Text>
      </Flex>
    </Flex>
  )
}
