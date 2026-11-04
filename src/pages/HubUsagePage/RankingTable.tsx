import React from 'react'
import { Link, Table, Text } from '@radix-ui/themes'
import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'
import { Link as RouterLink, To } from 'react-router-dom'
import { ChangeText } from './ChangeText'
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

/** Where the balances read is: balances fill in after the ranking shows. */
export type BalancesState = 'loading' | 'error' | 'ready'

interface RankingTableProps {
  rows: RankingRow[]
  total: Credits
  showChange: boolean
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
  onOpen: (workspace: string) => void
  workspaceLink: (workspace: string) => To
  /** Shown in place of rows when there are none. */
  emptyMessage: string
  skuName: (sku: string) => string
  balances: BalancesState
}

export const RankingTable: React.FC<RankingTableProps> = ({
  rows,
  total,
  showChange,
  sortColumn,
  sortDirection,
  onSort,
  onOpen,
  workspaceLink,
  emptyMessage,
  skuName,
  balances,
}) => {
  const columns: Column[] = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'total', label: 'Total credits', align: 'right' },
    { key: 'share', label: 'Share', align: 'right' },
    { key: 'topSku', label: 'Top SKU' },
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
              <Link asChild>
                <RouterLink to={workspaceLink(row.workspace)}>{row.workspace}</RouterLink>
              </Link>
            </Table.Cell>
            <Table.Cell align="right" className={styles.number}>
              {formatCredits(row.total)}
            </Table.Cell>
            <Table.Cell align="right" className={styles.number}>
              {formatShare(row.share)}
            </Table.Cell>
            <Table.Cell>{skuName(row.topSku)}</Table.Cell>
            {showChange && (
              <Table.Cell align="right" className={styles.number}>
                <ChangeText text={formatChange(row.change)} />
              </Table.Cell>
            )}
            <BalanceCell balance={row.balance} state={balances} />
          </Table.Row>
        ))}
        <Table.Row className={styles.totalsRow}>
          <Table.Cell>Total, all workspaces</Table.Cell>
          <Table.Cell align="right" className={styles.number}>
            {formatCredits(total)}
          </Table.Cell>
          <Table.Cell align="right" className={styles.number}>
            {total > 0n ? formatShare(100) : ''}
          </Table.Cell>
          <Table.Cell />
          {showChange && <Table.Cell />}
          <Table.Cell />
        </Table.Row>
      </Table.Body>
    </Table.Root>
  )
}

const BalanceCell: React.FC<{ balance: Credits | undefined; state: BalancesState }> = ({
  balance,
  state,
}) => {
  if (state === 'loading') {
    return (
      <Table.Cell align="right" aria-busy="true">
        <Text color="gray" aria-label="Loading balance">
          …
        </Text>
      </Table.Cell>
    )
  }
  if (state === 'error') return <Table.Cell align="right">—</Table.Cell>
  return (
    <Table.Cell align="right" className={styles.number}>
      {balance === undefined ? '' : formatCredits(balance)}
    </Table.Cell>
  )
}
