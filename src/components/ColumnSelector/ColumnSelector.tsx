import React, { useState } from 'react'
import { Flex, Text, Popover, IconButton, Checkbox, Button } from '@radix-ui/themes'
import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ColumnConfig,
  ColumnId,
  getSelectableColumns,
  resetColumnConfig,
} from '@/library/columnConfig'
import styles from './ColumnSelector.module.scss'

interface ColumnSelectorProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

interface SortableColumnItemProps {
  column: ColumnConfig
  onToggle: (id: ColumnId) => void
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({ column, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.sortableItem}>
      <Flex align="center" gap="3" p="2" className={styles.columnRow}>
        <div
          {...attributes}
          {...listeners}
          className={styles.dragHandle}
          aria-label="Drag to reorder"
        >
          <HamburgerMenuIcon />
        </div>
        <Checkbox checked={column.visible} onCheckedChange={() => onToggle(column.id)} size="2" />
        <Text size="2">{column.label}</Text>
      </Flex>
    </div>
  )
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, onColumnsChange }) => {
  const [open, setOpen] = useState(false)
  const selectableColumns = getSelectableColumns(columns)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleToggle = (id: ColumnId) => {
    const updated = columns.map((col) => (col.id === id ? { ...col, visible: !col.visible } : col))
    onColumnsChange(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = selectableColumns.findIndex((col) => col.id === active.id)
      const newIndex = selectableColumns.findIndex((col) => col.id === over.id)

      const reordered = arrayMove(selectableColumns, oldIndex, newIndex)

      // Update order values based on new positions
      // Fixed columns keep their positions, selectable columns get new orders
      // Fixed columns are: Title (0), Workspace (1), Collection (2), View (11)
      // Selectable columns go between Collection and View (orders 3-10)
      const updatedSelectable = reordered.map((col, index) => {
        return { ...col, order: index + 3 }
      })

      // Reconstruct full column config maintaining fixed column positions
      const titleCol = columns.find((col) => col.id === ColumnId.TITLE)!
      const workspaceCol = columns.find((col) => col.id === ColumnId.WORKSPACE)!
      const collectionCol = columns.find((col) => col.id === ColumnId.COLLECTION)!
      const viewCol = columns.find((col) => col.id === ColumnId.VIEW)!

      const updated = [titleCol, workspaceCol, collectionCol, ...updatedSelectable, viewCol]

      onColumnsChange(updated)
    }
  }

  const handleReset = () => {
    const reset = resetColumnConfig()
    onColumnsChange(reset)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <IconButton variant="soft" size="3" aria-label="Column settings">
          <HamburgerMenuIcon />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content className={styles.popoverContent} size="2">
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">
            Columns
          </Text>
          <Text size="1" color="gray">
            Drag to reorder, check to show/hide
          </Text>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectableColumns.map((col) => col.id)}
              strategy={verticalListSortingStrategy}
            >
              <Flex direction="column" gap="1">
                {selectableColumns.map((column) => (
                  <SortableColumnItem key={column.id} column={column} onToggle={handleToggle} />
                ))}
              </Flex>
            </SortableContext>
          </DndContext>
          <Flex justify="end" mt="2">
            <Button size="2" variant="soft" color="gray" onClick={handleReset}>
              Reset to Defaults
            </Button>
          </Flex>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  )
}
