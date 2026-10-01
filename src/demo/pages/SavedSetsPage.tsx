import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import {
  Badge,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Link,
  Table,
  Text,
  Tooltip,
} from '@radix-ui/themes'
import { DotsHorizontalIcon, FileTextIcon, PlayIcon, SewingPinIcon } from '@radix-ui/react-icons'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { convertDateToLocalString } from '@/library/dateUtils'
import demoStore from '../demoStore'
import type { SavedSet } from '../demoTypes'
import { DemoBadge } from '../components/DemoBadge'
import { DeleteSetDialog } from '../components/DeleteSetDialog'
import { OpenNotebookDialog } from '../components/OpenNotebookDialog'
import { RunWorkflowDialog } from '../components/RunWorkflowDialog'
import { UseElsewhereDialog } from '../components/UseElsewhereDialog'
import { collectionsOf } from '../setUtils'
import { useOpenSetOnMap } from '../useOpenSetOnMap'
import { useRunContext } from '../useRunContext'
import styles from '../components/demo.module.scss'

export const SavedSetsPage = () => {
  const sets = useSelector(demoStore, ({ context }) => context.sets)
  const runContext = useRunContext({ inFinder: false })
  const openOnMap = useOpenSetOnMap()
  const [runSetId, setRunSetId] = useState<string>()
  const [elsewhereSet, setElsewhereSet] = useState<SavedSet>()
  const [notebookSet, setNotebookSet] = useState<SavedSet>()
  const [deleteSet, setDeleteSet] = useState<SavedSet>()

  return (
    <Flex direction="column" gap="6" className={styles.page}>
      <Flex justify="between" align="start" gap="4">
        <PageHeading
          title="Saved sets"
          subtitle="Named groups of items saved to your workspace. Everyone in the workspace can open them, run workflows on them, and use them in Jupyter or QGIS."
          badge="none"
        />
        <Flex gap="3" align="center">
          <Tooltip content="Clears sets, runs and created workflows back to the example data">
            <Button
              size="1"
              variant="ghost"
              color="gray"
              onClick={() => demoStore.send({ type: 'resetDemo' })}
            >
              Reset demo data
            </Button>
          </Tooltip>
          <DemoBadge />
        </Flex>
      </Flex>

      <Text size="2" color="gray">
        To make a new set, pin items in the{' '}
        <Link asChild>
          <RouterLink to="/finder/sentinel2_ard">Data Finder</RouterLink>
        </Link>{' '}
        and choose <strong>Save as set</strong> on the Pinned Items tab. Click a set to see its
        items.
      </Text>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Items</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Datasets</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created by</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sets.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={6}>
                <Text color="gray">No saved sets yet.</Text>
              </Table.Cell>
            </Table.Row>
          )}
          {sets.map((set) => (
            <Table.Row key={set.id} align="center">
              <Table.RowHeaderCell>
                <Flex direction="column" gap="1">
                  <Flex gap="2" align="center">
                    <Link asChild weight="medium">
                      <RouterLink to={set.id}>{set.name}</RouterLink>
                    </Link>
                    {set.isExample && (
                      <Badge color="gray" variant="soft" size="1">
                        Example
                      </Badge>
                    )}
                  </Flex>
                  {set.description && (
                    <Text size="1" color="gray">
                      {set.description}
                    </Text>
                  )}
                </Flex>
              </Table.RowHeaderCell>
              <Table.Cell>{set.items.length}</Table.Cell>
              <Table.Cell>
                <Flex gap="1" wrap="wrap">
                  {collectionsOf(set).map((c) => (
                    <Badge key={c} variant="outline" color="gray">
                      {c}
                    </Badge>
                  ))}
                </Flex>
              </Table.Cell>
              <Table.Cell>{set.createdBy}</Table.Cell>
              <Table.Cell>{convertDateToLocalString(new Date(set.updatedAt))}</Table.Cell>
              <Table.Cell>
                <Flex gap="2" justify="end" align="center">
                  <Tooltip content="Add these items to your pinned items on the map">
                    <Button size="1" variant="soft" onClick={() => openOnMap(set)}>
                      <SewingPinIcon /> Open on map
                    </Button>
                  </Tooltip>
                  <Button size="1" variant="soft" onClick={() => setRunSetId(set.id)}>
                    <PlayIcon /> Run workflow
                  </Button>
                  <Button size="1" variant="soft" onClick={() => setNotebookSet(set)}>
                    <FileTextIcon /> Open notebook
                  </Button>
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
                      <DropdownMenu.Item asChild>
                        <RouterLink to={set.id}>View items</RouterLink>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => setElsewhereSet(set)}>
                        Use with pyeodh or QGIS
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item color="red" onSelect={() => setDeleteSet(set)}>
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <RunWorkflowDialog
        open={!!runSetId}
        onOpenChange={(open) => !open && setRunSetId(undefined)}
        context={runContext}
        initialScope="set"
        initialSetId={runSetId}
      />

      {elsewhereSet && (
        <UseElsewhereDialog set={elsewhereSet} onClose={() => setElsewhereSet(undefined)} />
      )}

      <OpenNotebookDialog set={notebookSet} onClose={() => setNotebookSet(undefined)} />

      <DeleteSetDialog set={deleteSet} onClose={() => setDeleteSet(undefined)} />
    </Flex>
  )
}
