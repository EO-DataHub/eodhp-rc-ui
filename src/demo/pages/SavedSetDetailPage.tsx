import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from '@xstate/store/react'
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  Flex,
  IconButton,
  Link,
  Table,
  Text,
} from '@radix-ui/themes'
import {
  ArrowLeftIcon,
  DotsHorizontalIcon,
  FileTextIcon,
  ImageIcon,
  PlayIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { convertDateToLocalString, convertDateToUTCString } from '@/library/dateUtils'
import demoStore from '../demoStore'
import type { SetItem } from '../demoTypes'
import { DemoBadge } from '../components/DemoBadge'
import { DeleteSetDialog } from '../components/DeleteSetDialog'
import { OpenNotebookDialog } from '../components/OpenNotebookDialog'
import { RunWorkflowDialog } from '../components/RunWorkflowDialog'
import { UseElsewhereDialog } from '../components/UseElsewhereDialog'
import { collectionsOf } from '../setUtils'
import { useOpenSetOnMap } from '../useOpenSetOnMap'
import { useRunContext } from '../useRunContext'
import styles from '../components/demo.module.scss'

const Thumbnail = ({ item }: { item: SetItem }) => {
  const [failed, setFailed] = useState(false)
  const href = item.pinned?.assets?.thumbnail?.href

  if (!href || failed) {
    return (
      <Flex className={styles.thumbnail} align="center" justify="center">
        <ImageIcon color="var(--gray-8)" />
      </Flex>
    )
  }
  return (
    <img
      className={styles.thumbnail}
      src={href}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export const SavedSetDetailPage = () => {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const set = useSelector(demoStore, ({ context }) => context.sets.find((s) => s.id === setId))
  const runContext = useRunContext({ inFinder: false })
  const openOnMap = useOpenSetOnMap()
  const [selected, setSelected] = useState<string[]>([])
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [isElsewhereOpen, setIsElsewhereOpen] = useState(false)
  const [isNotebookOpen, setIsNotebookOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const backLink = (
    <Link asChild size="2">
      <RouterLink to="/workflows/saved-sets">
        <Flex align="center" gap="1">
          <ArrowLeftIcon /> Saved sets
        </Flex>
      </RouterLink>
    </Link>
  )

  if (!set) {
    return (
      <Flex direction="column" gap="4" className={styles.page}>
        {backLink}
        <Text color="gray">This set doesn&apos;t exist, or it was deleted.</Text>
      </Flex>
    )
  }

  const allSelected = set.items.length > 0 && selected.length === set.items.length
  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)))
  const removeItems = (itemIds: string[]) => {
    demoStore.send({ type: 'removeSetItems', setId: set.id, itemIds })
    setSelected((prev) => prev.filter((id) => !itemIds.includes(id)))
  }

  return (
    <Flex direction="column" gap="5" className={styles.page}>
      {backLink}

      <Flex justify="between" align="start" gap="4">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <PageHeading title={set.name} badge="none" />
            {set.isExample && (
              <Badge color="gray" variant="soft">
                Example
              </Badge>
            )}
          </Flex>
          {set.description && <Text color="gray">{set.description}</Text>}
          <Text size="2" color="gray">
            {set.items.length} items · {collectionsOf(set).join(', ') || 'no datasets'} · created by{' '}
            {set.createdBy} on {convertDateToLocalString(new Date(set.createdAt))} · updated{' '}
            {convertDateToLocalString(new Date(set.updatedAt))}
          </Text>
        </Flex>
        <DemoBadge />
      </Flex>

      <Flex gap="2" wrap="wrap">
        <Button variant="soft" onClick={() => openOnMap(set)} disabled={set.items.length === 0}>
          <SewingPinIcon /> Open on map
        </Button>
        <Button variant="soft" onClick={() => setIsRunOpen(true)} disabled={set.items.length === 0}>
          <PlayIcon /> Run workflow
        </Button>
        <Button
          variant="soft"
          onClick={() => setIsNotebookOpen(true)}
          disabled={set.items.length === 0}
        >
          <FileTextIcon /> Open notebook
        </Button>
        <Button variant="soft" color="gray" onClick={() => setIsElsewhereOpen(true)}>
          Use with pyeodh or QGIS
        </Button>
        <Button variant="soft" color="red" onClick={() => setIsDeleteOpen(true)}>
          Delete set
        </Button>
      </Flex>

      {selected.length > 0 && (
        <Flex gap="3" align="center" className={styles.selectionBar}>
          <Text size="2" weight="medium">
            {selected.length} selected
          </Text>
          <Button size="1" variant="soft" onClick={() => openOnMap(set, selected)}>
            <SewingPinIcon /> Open selected on map
          </Button>
          <Button size="1" variant="soft" color="red" onClick={() => removeItems(selected)}>
            Remove from set
          </Button>
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
                checked={allSelected ? true : selected.length > 0 ? 'indeterminate' : false}
                onCheckedChange={(checked) =>
                  setSelected(checked === true ? set.items.map((i) => i.id) : [])
                }
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="64px" />
            <Table.ColumnHeaderCell>Item</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Dataset</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Date (UTC)</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {set.items.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={6}>
                <Text color="gray">This set is empty.</Text>
              </Table.Cell>
            </Table.Row>
          )}
          {set.items.map((item) => (
            <Table.Row key={item.id} align="center">
              <Table.Cell>
                <Checkbox
                  aria-label={`Select ${item.id}`}
                  checked={selected.includes(item.id)}
                  onCheckedChange={(checked) => toggle(item.id, checked === true)}
                />
              </Table.Cell>
              <Table.Cell>
                <Thumbnail item={item} />
              </Table.Cell>
              <Table.RowHeaderCell>
                <span className={styles.code}>{item.id}</span>
              </Table.RowHeaderCell>
              <Table.Cell>
                <Badge variant="outline" color="gray">
                  {item.collection}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {item.datetime ? convertDateToUTCString(new Date(item.datetime)) : '—'}
              </Table.Cell>
              <Table.Cell>
                <Flex justify="end">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <IconButton size="1" variant="ghost" aria-label={`Actions for ${item.id}`}>
                        <DotsHorizontalIcon />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item onSelect={() => openOnMap(set, [item.id])}>
                        View on map
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item color="red" onSelect={() => removeItems([item.id])}>
                        Remove from set
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
        open={isRunOpen}
        onOpenChange={setIsRunOpen}
        context={runContext}
        initialScope="set"
        initialSetId={set.id}
      />
      {isElsewhereOpen && (
        <UseElsewhereDialog set={set} onClose={() => setIsElsewhereOpen(false)} />
      )}
      <OpenNotebookDialog
        set={isNotebookOpen ? set : undefined}
        onClose={() => setIsNotebookOpen(false)}
      />
      <DeleteSetDialog
        set={isDeleteOpen ? set : undefined}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => void navigate('/workflows/saved-sets')}
      />
    </Flex>
  )
}
