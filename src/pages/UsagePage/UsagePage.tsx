import React, { useEffect, useMemo, useState } from 'react'
import { Box, Flex, Select, Table, Text } from '@radix-ui/themes'
import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'
import { Callout } from '@/components/Callout/Callout'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import styles from './UsagePage.module.scss'

// UI/UX preview only — see "Build the Accounting page set in eodhp-rc-ui" task note.
// No usage API exists yet (it's being redesigned); every row below is illustrative mock data.
//
// Compute (CPU+GPU) only — storage isn't a per-use billed item under the purchased-plan model
// (see BudgetPage), so it has no usage ledger here, the same way Google Drive doesn't show one.
interface UsageRecord {
  id: string
  item: string
  unit: string
  date: string
  quantity: number
  credits: number
}

const MOCK_USAGE: UsageRecord[] = [
  { id: 'u7', item: 'CPU', unit: 'hour', date: '2026-06-08', quantity: 40, credits: 40 },
  { id: 'u8', item: 'CPU', unit: 'hour', date: '2026-06-25', quantity: 35, credits: 35 },
  { id: 'u9', item: 'CPU', unit: 'hour', date: '2026-07-09', quantity: 50, credits: 50 },
  { id: 'u10', item: 'CPU', unit: 'hour', date: '2026-07-22', quantity: 28, credits: 28 },
  { id: 'u11', item: 'CPU', unit: 'hour', date: '2026-08-03', quantity: 45, credits: 45 },
  { id: 'u12', item: 'CPU', unit: 'hour', date: '2026-08-11', quantity: 33, credits: 33 },
  { id: 'u13', item: 'GPU', unit: 'hour', date: '2026-06-12', quantity: 6, credits: 60 },
  { id: 'u14', item: 'GPU', unit: 'hour', date: '2026-06-28', quantity: 4, credits: 40 },
  { id: 'u15', item: 'GPU', unit: 'hour', date: '2026-07-14', quantity: 8, credits: 80 },
  { id: 'u16', item: 'GPU', unit: 'hour', date: '2026-07-27', quantity: 5, credits: 50 },
  { id: 'u17', item: 'GPU', unit: 'hour', date: '2026-08-06', quantity: 9, credits: 90 },
  { id: 'u18', item: 'GPU', unit: 'hour', date: '2026-08-12', quantity: 7, credits: 70 },
]

const PAGE_SIZE = 10

type SortColumn = 'item' | 'quantity' | 'date' | 'credits'

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export const UsagePage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(0)

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(MOCK_USAGE.map((row) => row.date.slice(0, 7)))).sort()
    return months.map((month) => ({
      value: month,
      label: MONTH_FORMATTER.format(new Date(`${month}-01`)),
    }))
  }, [])

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedMonth, sortColumn, sortDirection])

  const filteredRows = useMemo(() => {
    const rows =
      selectedMonth === 'all'
        ? MOCK_USAGE
        : MOCK_USAGE.filter((row) => row.date.slice(0, 7) === selectedMonth)

    return [...rows].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'item':
          comparison = a.item.localeCompare(b.item)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'credits':
          comparison = a.credits - b.credits
          break
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [selectedMonth, sortColumn, sortDirection])

  const totalCredits = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.credits, 0),
    [filteredRows],
  )

  const pageCount = Math.ceil(filteredRows.length / PAGE_SIZE)
  const paginatedRows = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE
    return filteredRows.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredRows, currentPage])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <CaretSortIcon />
    return sortDirection === 'asc' ? <CaretUpIcon /> : <CaretDownIcon />
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Usage
        </Text>
        <Text size="3" color="gray">
          Compute usage history for this workspace — storage usage is on the Budget page
        </Text>
      </Flex>

      <Flex direction="column" gap="5">
        <Flex p="5" direction="row" gap="2" align="center" className={styles.filterContainer}>
          <Box width="220px">
            <Select.Root size="3" value={selectedMonth} onValueChange={setSelectedMonth}>
              <Select.Trigger style={{ width: '100%' }} />
              <Select.Content position="popper">
                <Select.Group>
                  <Select.Item value="all">All months</Select.Item>
                  {monthOptions.map((month) => (
                    <Select.Item key={month.value} value={month.value}>
                      {month.label}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>
        </Flex>

        {filteredRows.length === 0 ? (
          <Callout type="info" message="No usage recorded for this period." />
        ) : (
          <>
            <Text size="2" color="gray">
              {pageCount > 1
                ? `Showing ${currentPage * PAGE_SIZE + 1}-${Math.min(
                    (currentPage + 1) * PAGE_SIZE,
                    filteredRows.length,
                  )} of ${filteredRows.length} usage records — total ${totalCredits} credits`
                : `Showing ${filteredRows.length} usage record${filteredRows.length === 1 ? '' : 's'} — total ${totalCredits} credits`}
            </Text>

            <Table.Root className={styles.usageTable}>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>
                    <Flex
                      align="center"
                      gap="1"
                      className={styles.sortableHeader}
                      onClick={() => handleSort('item')}
                    >
                      Resource type {renderSortIcon('item')}
                    </Flex>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    <Flex
                      align="center"
                      gap="1"
                      className={styles.sortableHeader}
                      onClick={() => handleSort('quantity')}
                    >
                      Quantity {renderSortIcon('quantity')}
                    </Flex>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Unit</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    <Flex
                      align="center"
                      gap="1"
                      className={styles.sortableHeader}
                      onClick={() => handleSort('date')}
                    >
                      Date {renderSortIcon('date')}
                    </Flex>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    <Flex
                      align="center"
                      gap="1"
                      className={styles.sortableHeader}
                      onClick={() => handleSort('credits')}
                    >
                      Credits {renderSortIcon('credits')}
                    </Flex>
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedRows.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      <Text size="2" weight="medium">
                        {row.item}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>{row.quantity}</Table.Cell>
                    <Table.Cell>{row.unit}</Table.Cell>
                    <Table.Cell>{new Date(row.date).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>{row.credits}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>

            {pageCount > 1 && (
              <Flex justify="center" mt="4">
                <PageSelector
                  currentPageIndex={currentPage}
                  nextDisabled={currentPage === pageCount - 1}
                  onGoToPage={setCurrentPage}
                  onNextClick={() => setCurrentPage(currentPage + 1)}
                  onPreviousClick={() => setCurrentPage(currentPage - 1)}
                  pageCount={pageCount}
                  previousDisabled={currentPage === 0}
                />
              </Flex>
            )}
          </>
        )}

        <Box>
          <Text size="1" color="gray">
            (UI preview only — usage figures are illustrative, not real.)
          </Text>
        </Box>
      </Flex>
    </Flex>
  )
}
