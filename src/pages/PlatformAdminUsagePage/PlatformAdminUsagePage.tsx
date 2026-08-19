import React, { useEffect, useMemo, useState } from 'react'
import { Box, Flex, Select, Table, Text } from '@radix-ui/themes'
import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'
import { Callout } from '@/components/Callout/Callout'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import styles from './PlatformAdminUsagePage.module.scss'

// UI preview only — see docs/pending-backend-apis.md. No cross-workspace usage API exists
// yet (fetchWorkspaces is caller-scoped, not platform-wide); every row below is illustrative
// mock data, and the workspace list is hardcoded rather than fetched.
interface PlatformUsageRecord {
  id: string
  workspace: string
  item: 'CPU' | 'GPU'
  unit: string
  date: string
  quantity: number
  credits: number
}

const MOCK_PLATFORM_USAGE: PlatformUsageRecord[] = [
  {
    id: 'p1',
    workspace: 'sparkgeotest',
    item: 'CPU',
    unit: 'hour',
    date: '2026-07-04',
    quantity: 120,
    credits: 120,
  },
  {
    id: 'p2',
    workspace: 'sparkgeotest',
    item: 'GPU',
    unit: 'hour',
    date: '2026-07-18',
    quantity: 22,
    credits: 220,
  },
  {
    id: 'p3',
    workspace: 'sparkgeodemo',
    item: 'CPU',
    unit: 'hour',
    date: '2026-07-09',
    quantity: 60,
    credits: 60,
  },
  {
    id: 'p4',
    workspace: 'sparkgeodemo',
    item: 'GPU',
    unit: 'hour',
    date: '2026-08-02',
    quantity: 9,
    credits: 90,
  },
  {
    id: 'p5',
    workspace: 'samples-opencosmos',
    item: 'CPU',
    unit: 'hour',
    date: '2026-06-21',
    quantity: 340,
    credits: 340,
  },
  {
    id: 'p6',
    workspace: 'samples-opencosmos',
    item: 'GPU',
    unit: 'hour',
    date: '2026-07-30',
    quantity: 48,
    credits: 480,
  },
  {
    id: 'p7',
    workspace: 'samples-opencosmos',
    item: 'CPU',
    unit: 'hour',
    date: '2026-08-10',
    quantity: 210,
    credits: 210,
  },
  {
    id: 'p8',
    workspace: 'discoveryreg',
    item: 'CPU',
    unit: 'hour',
    date: '2026-07-14',
    quantity: 15,
    credits: 15,
  },
  {
    id: 'p9',
    workspace: 'discoveryreg',
    item: 'GPU',
    unit: 'hour',
    date: '2026-08-05',
    quantity: 3,
    credits: 30,
  },
  {
    id: 'p10',
    workspace: 'open-cosmos',
    item: 'CPU',
    unit: 'hour',
    date: '2026-06-30',
    quantity: 95,
    credits: 95,
  },
  {
    id: 'p11',
    workspace: 'open-cosmos',
    item: 'GPU',
    unit: 'hour',
    date: '2026-07-25',
    quantity: 14,
    credits: 140,
  },
  {
    id: 'p12',
    workspace: 'ucl-london-airbus',
    item: 'CPU',
    unit: 'hour',
    date: '2026-08-01',
    quantity: 40,
    credits: 40,
  },
]

const PAGE_SIZE = 10

type SortColumn = 'workspace' | 'item' | 'quantity' | 'date' | 'credits'

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export const PlatformAdminUsagePage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedWorkspace, setSelectedWorkspace] = useState('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(0)

  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set(MOCK_PLATFORM_USAGE.map((row) => row.date.slice(0, 7))),
    ).sort()
    return months.map((month) => ({
      value: month,
      label: MONTH_FORMATTER.format(new Date(`${month}-01`)),
    }))
  }, [])

  const workspaceOptions = useMemo(
    () => Array.from(new Set(MOCK_PLATFORM_USAGE.map((row) => row.workspace))).sort(),
    [],
  )

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedMonth, selectedWorkspace, sortColumn, sortDirection])

  // Only month-filtered — feeds the by-workspace leaderboard below, which should always show
  // every workspace's total regardless of which single workspace the main table is filtered to.
  const monthFilteredRows = useMemo(
    () =>
      selectedMonth === 'all'
        ? MOCK_PLATFORM_USAGE
        : MOCK_PLATFORM_USAGE.filter((row) => row.date.slice(0, 7) === selectedMonth),
    [selectedMonth],
  )

  const usageByWorkspace = useMemo(() => {
    const totals = new Map<string, number>()
    monthFilteredRows.forEach((row) => {
      totals.set(row.workspace, (totals.get(row.workspace) ?? 0) + row.credits)
    })
    return Array.from(totals.entries())
      .map(([workspace, credits]) => ({ workspace, credits }))
      .sort((a, b) => b.credits - a.credits)
  }, [monthFilteredRows])

  const filteredRows = useMemo(() => {
    const rows =
      selectedWorkspace === 'all'
        ? monthFilteredRows
        : monthFilteredRows.filter((row) => row.workspace === selectedWorkspace)

    return [...rows].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'workspace':
          comparison = a.workspace.localeCompare(b.workspace)
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
  }, [monthFilteredRows, selectedWorkspace, sortColumn, sortDirection])

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
        subtitle="Usage across every workspace on the platform"
        hideWorkspace
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
            <Select.Root size="3" value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <Select.Trigger style={{ width: '100%' }} />
              <Select.Content position="popper">
                <Select.Group>
                  <Select.Item value="all">All workspaces</Select.Item>
                  {workspaceOptions.map((workspace) => (
                    <Select.Item key={workspace} value={workspace}>
                      {workspace}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Usage by workspace
            {selectedMonth !== 'all'
              ? ` — ${MONTH_FORMATTER.format(new Date(`${selectedMonth}-01`))}`
              : ''}
          </Text>
          <Table.Root className={styles.usageTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Workspace</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {usageByWorkspace.map((row) => (
                <Table.Row key={row.workspace}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {row.workspace}
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
                      onClick={() => handleSort('workspace')}
                    >
                      Workspace {renderSortIcon('workspace')}
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
                    <Table.Cell>{row.workspace}</Table.Cell>
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
          <Text size="1" color="red">
            (UI preview only — usage figures are illustrative, not real; the workspace list is
            hardcoded, not fetched.)
          </Text>
        </Box>
      </Flex>
    </Flex>
  )
}
