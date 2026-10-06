import React, { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { Button, Checkbox, Flex, IconButton, Link, Table, Text, Tooltip } from '@radix-ui/themes'
import { ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons'
import { useCanEditSavedSet, useSavedSet, useSavedSetMutations } from '@/hooks/useSavedSets'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { OpenSetOnMapButton } from '@/components/SavedSets/OpenSetOnMapButton'
import { DeleteSavedSetDialog, EditSavedSetDialog } from '@/components/SavedSets/SavedSetDialogs'
import { convertDateToLocalString } from '@/library/dateUtils'
import styles from '../MyDataPage/MyDataPage.module.scss'

export const SavedSetDetailPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const { data: set, isLoading, error } = useSavedSet(setId)
  const { canEdit } = useCanEditSavedSet()
  const { removeItem, removeItems } = useSavedSetMutations()
  const [selected, setSelected] = useState<string[]>([])
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const backLink = (
    <Link asChild size="2">
      <RouterLink to="/my-data/saved-sets">
        <Flex align="center" gap="1">
          <ArrowLeftIcon /> Saved sets
        </Flex>
      </RouterLink>
    </Link>
  )

  if (isLoading) {
    return (
      <Flex direction="column" gap="5" className={styles.mainContainer}>
        {backLink}
        <LoadingIndicator />
      </Flex>
    )
  }

  if (!set) {
    return (
      <Flex direction="column" gap="5" className={styles.mainContainer}>
        {backLink}
        <Callout
          type="error"
          message={error?.message ?? "This saved set doesn't exist, or it was deleted."}
        />
      </Flex>
    )
  }

  const editable = canEdit(set)
  const selectedInSet = selected.filter((id) => set.items.some((item) => item.id === id))
  const allSelected = set.items.length > 0 && selectedInSet.length === set.items.length
  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)))

  const removeError = removeItem.error ?? removeItems.error
  const isRemoving = removeItem.isPending || removeItems.isPending

  const removeSelected = () => {
    // Clear the selection even on partial failure; the refetched set shows what's left.
    removeItems.mutate(
      { setId: set.id, entryIds: selectedInSet },
      { onSettled: () => setSelected([]) },
    )
  }

  return (
    <Flex direction="column" gap="5" className={styles.mainContainer}>
      {backLink}

      <Flex direction="column" gap="2">
        <PageHeading title={set.name} subtitle={set.description || undefined} />
        <Text size="2" color="gray">
          {set.itemCount} {set.itemCount === 1 ? 'item' : 'items'} · created by {set.createdBy} on{' '}
          {convertDateToLocalString(new Date(set.createdAt))} · updated{' '}
          {convertDateToLocalString(new Date(set.updatedAt))}
        </Text>
      </Flex>

      <Flex gap="2" wrap="wrap">
        <OpenSetOnMapButton setId={set.id} setName={set.name} disabled={set.items.length === 0} />
        {editable && (
          <>
            <Button variant="soft" color="gray" onClick={() => setIsEditOpen(true)}>
              Edit
            </Button>
            <Button variant="soft" color="red" onClick={() => setIsDeleteOpen(true)}>
              Delete set
            </Button>
          </>
        )}
      </Flex>

      {removeError && <Callout type="error" message={removeError.message} />}

      {selectedInSet.length > 0 && (
        <Flex
          gap="3"
          align="center"
          p="3"
          style={{ background: 'var(--gray-a3)', borderRadius: 'var(--radius-3)' }}
        >
          <Text size="2" weight="medium">
            {selectedInSet.length} selected
          </Text>
          <OpenSetOnMapButton
            setId={set.id}
            setName={set.name}
            entryIds={selectedInSet}
            label="Open selected on map"
            size="1"
          />
          {editable && (
            <Button
              size="1"
              variant="soft"
              color="red"
              disabled={isRemoving}
              onClick={removeSelected}
            >
              Remove from set
            </Button>
          )}
          <Button size="1" variant="ghost" color="gray" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </Flex>
      )}

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row align="center">
            <Table.ColumnHeaderCell width="40px">
              <Checkbox
                aria-label="Select all items"
                checked={allSelected ? true : selectedInSet.length > 0 ? 'indeterminate' : false}
                onCheckedChange={(checked) =>
                  setSelected(checked === true ? set.items.map((item) => item.id) : [])
                }
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Item</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Collection</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {set.items.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <Text color="gray">This set is empty.</Text>
              </Table.Cell>
            </Table.Row>
          )}
          {set.items.map((item) => (
            <Table.Row key={item.id} align="center">
              <Table.Cell>
                <Checkbox
                  aria-label={`Select ${item.itemId}`}
                  checked={selectedInSet.includes(item.id)}
                  onCheckedChange={(checked) => toggle(item.id, checked === true)}
                />
              </Table.Cell>
              <Table.RowHeaderCell>
                <Text style={{ wordBreak: 'break-all' }}>{item.itemId}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{item.collectionId}</Table.Cell>
              <Table.Cell>{convertDateToLocalString(new Date(item.addedAt))}</Table.Cell>
              <Table.Cell>
                <Flex gap="3" justify="end" align="center">
                  <OpenSetOnMapButton
                    setId={set.id}
                    setName={set.name}
                    entryIds={[item.id]}
                    label="View on map"
                    size="1"
                    variant="ghost"
                  />
                  {editable && (
                    <Tooltip content="Remove from set">
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="red"
                        aria-label={`Remove ${item.itemId} from set`}
                        disabled={isRemoving}
                        onClick={() => removeItem.mutate({ setId: set.id, entryId: item.id })}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <EditSavedSetDialog set={isEditOpen ? set : undefined} onClose={() => setIsEditOpen(false)} />
      <DeleteSavedSetDialog
        set={isDeleteOpen ? set : undefined}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => void navigate('/my-data/saved-sets')}
      />
    </Flex>
  )
}
