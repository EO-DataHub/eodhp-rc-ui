import React, { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { DropdownMenu, Flex, IconButton, Link, Table, Text } from '@radix-ui/themes'
import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { useCanEditSavedSet, useSavedSets } from '@/hooks/useSavedSets'
import type { SavedSetSummary } from '@/services/savedSetsService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { OpenSetInJupyterDialog } from '@/components/SavedSets/OpenSetInJupyterDialog'
import { OpenSetOnMapButton } from '@/components/SavedSets/OpenSetOnMapButton'
import { DeleteSavedSetDialog, EditSavedSetDialog } from '@/components/SavedSets/SavedSetDialogs'
import { convertDateToLocalString } from '@/library/dateUtils'
import styles from '../MyDataPage/MyDataPage.module.scss'

export const SavedSetsPage: React.FC = () => {
  const { data: sets, isLoading, error } = useSavedSets()
  const { canEdit } = useCanEditSavedSet()
  const [editSet, setEditSet] = useState<SavedSetSummary>()
  const [deleteSet, setDeleteSet] = useState<SavedSetSummary>()
  const [jupyterSet, setJupyterSet] = useState<SavedSetSummary>()

  return (
    <Flex direction="column" gap="6" className={styles.mainContainer}>
      <PageHeading
        title="Saved sets"
        subtitle="Named groups of items saved to this workspace. Everyone in the workspace can open them on the map."
      />

      <Text size="2" color="gray">
        To make a set, pin items in the{' '}
        <Link asChild>
          <RouterLink to="/finder/sentinel2_ard">Data Finder</RouterLink>
        </Link>{' '}
        and choose <strong>Save as set</strong> on the Pinned Items tab.
      </Text>

      {error && <Callout type="error" message={error.message} />}

      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Items</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created by</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sets?.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text color="gray">No saved sets in this workspace yet.</Text>
                </Table.Cell>
              </Table.Row>
            )}
            {sets?.map((set) => (
              <Table.Row key={set.id} align="center">
                <Table.RowHeaderCell>
                  <Flex direction="column" gap="1">
                    <Link asChild weight="medium">
                      <RouterLink to={set.id}>{set.name}</RouterLink>
                    </Link>
                    {set.description && (
                      <Text size="1" color="gray">
                        {set.description}
                      </Text>
                    )}
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell>{set.itemCount}</Table.Cell>
                <Table.Cell>{set.createdBy}</Table.Cell>
                <Table.Cell>{convertDateToLocalString(new Date(set.updatedAt))}</Table.Cell>
                <Table.Cell>
                  <Flex gap="3" justify="end" align="center">
                    <OpenSetOnMapButton
                      setId={set.id}
                      setName={set.name}
                      size="1"
                      disabled={set.itemCount === 0}
                    />
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <IconButton
                          size="1"
                          variant="ghost"
                          aria-label={`More actions for ${set.name}`}
                        >
                          <DotsHorizontalIcon />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item
                          disabled={set.itemCount === 0}
                          onSelect={() => setJupyterSet(set)}
                        >
                          Open in Jupyter…
                        </DropdownMenu.Item>
                        {canEdit(set) && (
                          <>
                            <DropdownMenu.Item onSelect={() => setEditSet(set)}>
                              Edit
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item color="red" onSelect={() => setDeleteSet(set)}>
                              Delete
                            </DropdownMenu.Item>
                          </>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <EditSavedSetDialog set={editSet} onClose={() => setEditSet(undefined)} />
      <DeleteSavedSetDialog set={deleteSet} onClose={() => setDeleteSet(undefined)} />
      <OpenSetInJupyterDialog set={jupyterSet} onClose={() => setJupyterSet(undefined)} />
    </Flex>
  )
}
