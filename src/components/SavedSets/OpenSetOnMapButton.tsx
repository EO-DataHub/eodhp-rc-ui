import React, { useContext, useState } from 'react'
import { AlertDialog, Button, ButtonProps, Flex } from '@radix-ui/themes'
import { SewingPinIcon } from '@radix-ui/react-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { savedSetKey } from '@/hooks/useSavedSets'
import { OpenSetMode, useOpenSavedSet } from '@/hooks/useOpenSavedSet'
import { fetchSavedSet } from '@/services/savedSetsService'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

interface OpenSetOnMapButtonProps {
  setId: string
  setName: string
  /** Only open these entries of the set. Opens the whole set when omitted. */
  entryIds?: string[]
  label?: string
  size?: ButtonProps['size']
  variant?: ButtonProps['variant']
  disabled?: boolean
}

/** Opens a saved set on the map. If items are already pinned, asks whether to replace or add. */
export const OpenSetOnMapButton: React.FC<OpenSetOnMapButtonProps> = ({
  setId,
  setName,
  entryIds,
  label = 'Open on map',
  size = '2',
  variant = 'soft',
  disabled,
}) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const queryClient = useQueryClient()
  const openSavedSet = useOpenSavedSet()
  const pinnedCount = useSelector(dataFinderStore, ({ context }) => context.pinnedItems.length)
  const [isAskOpen, setIsAskOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)

  const open = async (mode: OpenSetMode) => {
    setIsAskOpen(false)
    if (!token || !currentWorkspace) return
    setIsOpening(true)
    try {
      // The list page only has set summaries, so load the items here.
      const set = await queryClient.fetchQuery({
        queryKey: savedSetKey(currentWorkspace, setId),
        queryFn: () => fetchSavedSet(currentWorkspace, setId, token),
      })
      await openSavedSet(set, mode, entryIds)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Couldn't open '${setName}'.`)
    } finally {
      setIsOpening(false)
    }
  }

  const onClick = () => {
    if (pinnedCount > 0) {
      setIsAskOpen(true)
    } else {
      void open('replace')
    }
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={onClick}
        disabled={Boolean(disabled) || isOpening}
      >
        <SewingPinIcon /> {isOpening ? 'Opening…' : label}
      </Button>

      <AlertDialog.Root open={isAskOpen} onOpenChange={setIsAskOpen}>
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>You already have pinned items</AlertDialog.Title>
          <AlertDialog.Description size="2">
            You have {pinnedCount} pinned {pinnedCount === 1 ? 'item' : 'items'}. Replace them with
            the items from &apos;{setName}&apos;, or add these items to them?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button variant="soft" onClick={() => void open('add')}>
              Add to pinned items
            </Button>
            <Button onClick={() => void open('replace')}>Replace pinned items</Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  )
}
