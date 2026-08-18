import React, { useEffect, useMemo, useState } from 'react'
import { Box, Flex, Select, Table, Text } from '@radix-ui/themes'
import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'
import { Callout } from '@/components/Callout/Callout'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import styles from './UsagePage.module.scss'

// UI/UX preview only — see "Build the Accounting page set in eodhp-rc-ui" task note.
// No usage API exists yet (it's being redesigned); every row below is illustrative mock data.
//
// Compute (CPU+GPU) only — storage isn't a per-use billed item under the purchased-plan model
// (see BudgetPage), so it has no usage ledger here, the same way Google Drive doesn't show one.
interface UsageRecord {
  id: string
  user: string
  item: string
  unit: string
  date: string
  quantity: number
  credits: number
}

const MOCK_USAGE: UsageRecord[] = [
  {
    id: 'u7',
    user: 'agstephens',
    item: 'CPU',
    unit: 'hour',
    date: '2026-06-08',
    quantity: 40,
    credits: 40,
  },
  {
    id: 'u8',
    user: 'ajgwords',
    item: 'CPU',
    unit: 'hour',
    date: '2026-06-25',
    quantity: 35,
    credits: 35,
  },
  {
    id: 'u9',
    user: 'agstephens',
    item: 'CPU',
    unit: 'hour',
    date: '2026-07-09',
    quantity: 50,
    credits: 50,
  },
  {
    id: 'u10',
    user: 'geodowd',
    item: 'CPU',
    unit: 'hour',
    date: '2026-07-22',
    quantity: 28,
    credits: 28,
  },
  {
    id: 'u11',
    user: 'agstephens',
    item: 'CPU',
    unit: 'hour',
    date: '2026-08-03',
    quantity: 45,
    credits: 45,
  },
  {
    id: 'u12',
    user: 'ajgwords',
    item: 'CPU',
    unit: 'hour',
    date: '2026-08-11',
    quantity: 33,
    credits: 33,
  },
  {
    id: 'u13',
    user: 'geodowd',
    item: 'GPU',
    unit: 'hour',
    date: '2026-06-12',
    quantity: 6,
    credits: 60,
  },
  {
    id: 'u14',
    user: 'agstephens',
    item: 'GPU',
    unit: 'hour',
    date: '2026-06-28',
    quantity: 4,
    credits: 40,
  },
  {
    id: 'u15',
    user: 'geodowd',
    item: 'GPU',
    unit: 'hour',
    date: '2026-07-14',
    quantity: 8,
    credits: 80,
  },
  {
    id: 'u16',
    user: 'ajgwords',
    item: 'GPU',
    unit: 'hour',
    date: '2026-07-27',
    quantity: 5,
    credits: 50,
  },
  {
    id: 'u17',
    user: 'geodowd',
    item: 'GPU',
    unit: 'hour',
    date: '2026-08-06',
    quantity: 9,
    credits: 90,
  },
  {
    id: 'u18',
    user: 'agstephens',
    item: 'GPU',
    unit: 'hour',
    date: '2026-08-12',
    quantity: 7,
    credits: 70,
  },
]

const PAGE_SIZE = 10

type SortColumn = 'user' | 'item' | 'quantity' | 'date' | 'credits'

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export const UsagePage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
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

  const userOptions = useMemo(
    () => Array.from(new Set(MOCK_USAGE.map((row) => row.user))).sort(),
    [],
  )

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedMonth, selectedUser, sortColumn, sortDirection])

  // Only month-filtered — feeds the by-user breakdown below, which should always show every
  // user's total regardless of which single user the main table is currently filtered to.
  const monthFilteredRows = useMemo(
    () =>
      selectedMonth === 'all'
        ? MOCK_USAGE
        : MOCK_USAGE.filter((row) => row.date.slice(0, 7) === selectedMonth),
    [selectedMonth],
  )

  const usageByUser = useMemo(() => {
    const totals = new Map<string, number>()
    monthFilteredRows.forEach((row) => {
      totals.set(row.user, (totals.get(row.user) ?? 0) + row.credits)
    })
    return Array.from(totals.entries())
      .map(([user, credits]) => ({ user, credits }))
      .sort((a, b) => b.credits - a.credits)
  }, [monthFilteredRows])

  const filteredRows = useMemo(() => {
    const rows =
      selectedUser === 'all'
        ? monthFilteredRows
        : monthFilteredRows.filter((row) => row.user === selectedUser)

    return [...rows].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'user':
          comparison = a.user.localeCompare(b.user)
          break
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
  }, [monthFilteredRows, selectedUser, sortColumn, sortDirection])

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
      <PageHeading
        title="Usage"
        subtitle="Compute usage history for this workspace — storage usage is on the Budget page"
      />

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
          <Box width="220px">
            <Select.Root size="3" value={selectedUser} onValueChange={setSelectedUser}>
              <Select.Trigger style={{ width: '100%' }} />
              <Select.Content position="popper">
                <Select.Group>
                  <Select.Item value="all">All users</Select.Item>
                  {userOptions.map((user) => (
                    <Select.Item key={user} value={user}>
                      {user}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Usage by user
            {selectedMonth !== 'all'
              ? ` — ${MONTH_FORMATTER.format(new Date(`${selectedMonth}-01`))}`
              : ''}
          </Text>
          <Table.Root className={styles.usageTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {usageByUser.map((row) => (
                <Table.Row key={row.user}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {row.user}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{row.credits}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
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
                      onClick={() => handleSort('user')}
                    >
                      User {renderSortIcon('user')}
                    </Flex>
                  </Table.ColumnHeaderCell>
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
                    <Table.Cell>{row.user}</Table.Cell>
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
