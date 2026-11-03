import React from 'react'
import { Table, Text } from '@radix-ui/themes'
import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'
import { Link, To } from 'react-router-dom'
import {
  Credits,
  formatChange,
  formatCredits,
  formatShare,
  RankingRow,
  SortColumn,
  SortDirection,
} from './hubRanking'
import styles from './HubUsagePage.module.scss'

interface Column {
  key: SortColumn
  label: string
  align?: 'right'
}

interface RankingTableProps {
  rows: RankingRow[]
  total: Credits
  showTopSku: boolean
  showChange: boolean
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
  onOpen: (workspace: string) => void
  workspaceLink: (workspace: string) => To
  /** Shown in place of rows when there are none. */
  emptyMessage: string
  skuName: (sku: string) => string
}

export const RankingTable: React.FC<RankingTableProps> = ({
  rows,
  total,
  showTopSku,
  showChange,
  sortColumn,
  sortDirection,
  onSort,
  onOpen,
  workspaceLink,
  emptyMessage,
  skuName,
}) => {
  const columns: Column[] = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'total', label: 'Total credits', align: 'right' },
    { key: 'share', label: 'Share', align: 'right' },
    ...(showTopSku ? [{ key: 'topSku' as const, label: 'Top SKU' }] : []),
    ...(showChange ? [{ key: 'change' as const, label: 'Change', align: 'right' as const }] : []),
    { key: 'balance', label: 'Balance now', align: 'right' },
  ]

  const sortIcon = (column: SortColumn) => {
    if (column !== sortColumn) return <CaretSortIcon aria-hidden />
    return sortDirection === 'ascending' ? (
      <CaretUpIcon aria-hidden />
    ) : (
      <CaretDownIcon aria-hidden />
    )
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          {columns.map((column) => (
            <Table.ColumnHeaderCell
              key={column.key}
              align={column.align}
              aria-sort={column.key === sortColumn ? sortDirection : undefined}
            >
              <button
                type="button"
                className={styles.sortButton}
                onClick={() => onSort(column.key)}
              >
                {column.label} {sortIcon(column.key)}
              </button>
            </Table.ColumnHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.length === 0 && (
          <Table.Row>
            <Table.Cell colSpan={columns.length}>
              <Text color="gray">{emptyMessage}</Text>
            </Table.Cell>
          </Table.Row>
        )}
        {rows.map((row) => (
          <Table.Row
            key={row.workspace}
            className={styles.clickableRow}
            onClick={(event) => {
              // The workspace link navigates by itself; the row is only a mouse shortcut.
              if ((event.target as Element).closest('a')) return
              onOpen(row.workspace)
            }}
          >
            <Table.Cell>
              <Link to={workspaceLink(row.workspace)}>{row.workspace}</Link>
            </Table.Cell>
            <Table.Cell align="right">{formatCredits(row.total)}</Table.Cell>
            <Table.Cell align="right">{formatShare(row.share)}</Table.Cell>
            {showTopSku && <Table.Cell>{skuName(row.topSku)}</Table.Cell>}
            {showChange && <Table.Cell align="right">{formatChange(row.change)}</Table.Cell>}
            <Table.Cell align="right">
              {row.balance === undefined ? '' : formatCredits(row.balance)}
            </Table.Cell>
          </Table.Row>
        ))}
        <Table.Row className={styles.totalsRow}>
          <Table.Cell>Total, all workspaces</Table.Cell>
          <Table.Cell align="right">{formatCredits(total)}</Table.Cell>
          <Table.Cell align="right">{total > 0n ? formatShare(100) : ''}</Table.Cell>
          {showTopSku && <Table.Cell />}
          {showChange && <Table.Cell />}
          <Table.Cell />
        </Table.Row>
      </Table.Body>
    </Table.Root>
  )
}
