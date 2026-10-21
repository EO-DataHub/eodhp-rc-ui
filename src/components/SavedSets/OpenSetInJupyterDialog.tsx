import React, { useContext, useMemo } from 'react'
import { Button, Dialog, Flex, RadioGroup, Text } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useNotebookLaunch } from '@/hooks/useNotebookLaunch'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { isPinSetNotebook } from '@/services/notebookVariableResolvers'
import { getHubApiOrigin } from '@/library/integrationTools'
import type { SavedSetSummary } from '@/services/savedSetsService'

/** Picks a notebook that works on saved sets and launches it in Jupyter for this set. */
export const OpenSetInJupyterDialog: React.FC<{
  set?: SavedSetSummary
  onClose: () => void
}> = ({ set, onClose }) => {
  const { currentWorkspace, token, userInfo } = useContext(AuthenticationContext)
  const username = userInfo?.preferred_username

  const context = useMemo(
    () =>
      set
        ? {
            workspace: set.workspace,
            apiBaseUrl: getHubApiOrigin(),
            pinSet: { id: set.id, name: set.name },
          }
        : null,
    [set],
  )

  const {
    notebooks,
    selectedNotebook,
    setSelectedNotebook,
    launch,
    isLoadingNotebooks,
    isLaunching,
    notebooksError,
    launchError,
    retry,
  } = useNotebookLaunch({
    enabled: Boolean(set),
    filterNotebooks: isPinSetNotebook,
    autoSelectSingle: true,
    context,
    token,
    currentWorkspace,
    username,
  })

  const canLaunch = Boolean(token && currentWorkspace && selectedNotebook) && !isLaunching

  return (
    <Dialog.Root open={Boolean(set)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Open in Jupyter</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Launch a notebook that loads &apos;{set?.name}&apos;. The notebook asks for an EODH API
          token when you run it.
        </Dialog.Description>

        {isLoadingNotebooks && (
          <Flex py="4">
            <LoadingIndicator size="2" />
          </Flex>
        )}

        {notebooksError && (
          <Flex direction="column" gap="2">
            <Text size="2" color="red">
              Unable to load notebooks
            </Text>
            <Text size="2" color="gray">
              {notebooksError}
            </Text>
            <Button variant="soft" size="2" onClick={retry}>
              Retry
            </Button>
          </Flex>
        )}

        {!isLoadingNotebooks && !notebooksError && notebooks.length === 0 && (
          <Text size="2" color="gray">
            No notebooks for saved sets are available yet.
          </Text>
        )}

        {!isLoadingNotebooks && !notebooksError && notebooks.length > 0 && (
          <RadioGroup.Root
            value={selectedNotebook?.id ?? ''}
            onValueChange={(id) => setSelectedNotebook(notebooks.find((n) => n.id === id) ?? null)}
          >
            <Flex direction="column" gap="2">
              {notebooks.map((nb) => (
                <label key={nb.id} style={{ cursor: 'pointer' }}>
                  <Flex gap="2" align="center">
                    <RadioGroup.Item value={nb.id} />
                    <Flex direction="column" gap="0">
                      <Text size="2" weight="medium">
                        {nb.properties?.title ?? nb.id}
                      </Text>
                      {nb.properties?.description && (
                        <Text size="1" color="gray">
                          {nb.properties.description}
                        </Text>
                      )}
                    </Flex>
                  </Flex>
                </label>
              ))}
            </Flex>
          </RadioGroup.Root>
        )}

        {launchError && (
          <Text as="p" size="2" color="red" mt="3">
            {launchError}
          </Text>
        )}

        <Flex justify="end" gap="3" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button disabled={!canLaunch} onClick={() => void launch()}>
            {isLaunching ? 'Launching…' : 'Launch'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
