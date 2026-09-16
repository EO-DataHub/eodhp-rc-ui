import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Select, Table, Text } from '@radix-ui/themes'
import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchAllWorkspaceUsageData,
  fetchSkus,
  fetchWorkspaceUsageData,
} from '@/services/accountingService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { convertDateToUTCString } from '@/library/dateUtils'
import styles from './UsagePage.module.scss'

// The real usage-data API returns raw quantity per SKU, with no credit conversion and no
// per-user breakdown — converting to credits needs a workspace-category lookup that doesn't
// exist yet, and there is no user field on a billing event at all. Both are known gaps; see
// the "Wire eodhp-rc-ui Accounting pages to the real accounting API" task note.
//
// The API has no way to ask for "most recent" events — only a start/end range or forward
// pagination via an `after` cursor over what appears to be an oldest-first, append-only
// ledger. Fetching an unscoped page of raw events landed on ancient history for any workspace
// with real usage. Instead: fetch `time-aggregation=month` once (cheap — one row per
// month/SKU, covers all history in a single page) to drive a months-by-resource pivot table,
// then fetch every raw event for whichever month the user picks on demand — bounded to one
// month, so following the `after` cursor to completion there is cheap and safe.
const PAGE_SIZE = 10

type SortColumn = 'item' | 'quantity' | 'date'

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

const getMonthBounds = (month: string) => {
  const [year, monthIndex] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, monthIndex - 1, 1))
  const end = new Date(Date.UTC(year, monthIndex, 1))
  return { start: start.toISOString(), end: end.toISOString() }
}

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2)

export const UsagePage: React.FC = () => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)

  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(0)

  const {
    data: monthlyUsage,
    isLoading: isMonthlyLoading,
    error: monthlyError,
  } = useQuery({
    queryKey: ['UsageMonthly', currentWorkspace, userInfo?.sub],
    queryFn: () => fetchWorkspaceUsageData(currentWorkspace!, token!, { timeAggregation: 'month' }),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const { data: skus } = useQuery({
    queryKey: ['BillingSkus', userInfo?.sub],
    queryFn: () => fetchSkus(token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  const skusBySku = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>()
    skus?.forEach((sku) => map.set(sku.sku, { name: sku.name, unit: sku.unit }))
    return map
  }, [skus])

  const resourceLabel = (sku: string) => skusBySku.get(sku)?.name ?? sku

  const monthlyRows = useMemo(() => monthlyUsage ?? [], [monthlyUsage])

  // Newest first, for the pivot table.
  const months = useMemo(() => {
    const values = Array.from(new Set(monthlyRows.map((event) => event.event_start.slice(0, 7))))
    return values.sort().reverse()
  }, [monthlyRows])

  // One fixed column set across every month, alphabetical by display name so the order stays
  // stable regardless of how usage shifts between months.
  const itemColumns = useMemo(
    () =>
      Array.from(new Set(monthlyRows.map((event) => event.item))).sort((a, b) =>
        (skusBySku.get(a)?.name ?? a).localeCompare(skusBySku.get(b)?.name ?? b),
      ),
    [monthlyRows, skusBySku],
  )

  const quantityByMonthAndItem = useMemo(() => {
    const map = new Map<string, number>()
    monthlyRows.forEach((event) => {
      const key = `${event.event_start.slice(0, 7)}|${event.item}`
      map.set(key, (map.get(key) ?? 0) + event.quantity)
    })
    return map
  }, [monthlyRows])

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedMonth, selectedItem, sortColumn, sortDirection])

  const usageByItemForSelectedMonth = useMemo(() => {
    const rows = monthlyRows.filter((event) => event.event_start.slice(0, 7) === selectedMonth)
    const totals = new Map<string, number>()
    rows.forEach((event) => {
      totals.set(event.item, (totals.get(event.item) ?? 0) + event.quantity)
    })
    return Array.from(totals.entries())
      .map(([item, quantity]) => ({ item, quantity }))
      .sort((a, b) => itemColumns.indexOf(a.item) - itemColumns.indexOf(b.item))
  }, [monthlyRows, selectedMonth, itemColumns])

  const monthBounds = useMemo(
    () => (selectedMonth ? getMonthBounds(selectedMonth) : null),
    [selectedMonth],
  )

  const {
    data: rawUsage,
    isLoading: isRawLoading,
    error: rawError,
  } = useQuery({
    queryKey: ['UsageRaw', currentWorkspace, selectedMonth, userInfo?.sub],
    queryFn: () =>
      fetchAllWorkspaceUsageData(currentWorkspace!, token!, {
        start: monthBounds!.start,
        end: monthBounds!.end,
      }),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace && monthBounds),
  })

  const rawEvents = useMemo(() => rawUsage ?? [], [rawUsage])

  const filteredRows = useMemo(() => {
    const rows =
      selectedItem === 'all' ? rawEvents : rawEvents.filter((event) => event.item === selectedItem)

    return [...rows].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'item':
          comparison = a.item.localeCompare(b.item)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'date':
          comparison = new Date(a.event_start).getTime() - new Date(b.event_start).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [rawEvents, selectedItem, sortColumn, sortDirection])

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

  const monthLabel = (month: string) => MONTH_FORMATTER.format(new Date(`${month}-01`))

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading title="Usage" subtitle="Compute usage history for this workspace" />

      <Flex direction="column" gap="5">
        {!token && <Callout type="info" message="Sign in to view usage history." />}

        {token && !currentWorkspace && (
          <Callout type="info" message="Select a workspace to view its usage history." />
        )}

        {monthlyError && (
          <Callout
            type="error"
            message={
              monthlyError instanceof Error ? monthlyError.message : 'Failed to load usage data.'
            }
          />
        )}

        {isMonthlyLoading && <LoadingIndicator size="3" />}

        {token && currentWorkspace && !isMonthlyLoading && !monthlyError && (
          <>
            {months.length === 0 && (
              <Callout type="info" message="No usage recorded for this workspace yet." />
            )}

            {months.length > 0 && !selectedMonth && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">
                  Months
                </Text>
                <Box className={styles.pivotTableWrapper}>
                  <Table.Root className={styles.usageTable}>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Month</Table.ColumnHeaderCell>
                        {itemColumns.map((item) => (
                          <Table.ColumnHeaderCell key={item}>
                            {resourceLabel(item)}
                            {skusBySku.get(item)?.unit ? ` (${skusBySku.get(item)!.unit})` : ''}
                          </Table.ColumnHeaderCell>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {months.map((month) => (
                        <Table.Row
                          key={month}
                          onClick={() => setSelectedMonth(month)}
                          className={styles.sortableHeader}
                        >
                          <Table.Cell>
                            <Text size="2" weight="medium">
                              {monthLabel(month)}
                            </Text>
                          </Table.Cell>
                          {itemColumns.map((item) => {
                            const quantity = quantityByMonthAndItem.get(`${month}|${item}`)
                            return (
                              <Table.Cell key={item}>
                                {quantity !== undefined ? formatQuantity(quantity) : '—'}
                              </Table.Cell>
                            )
                          })}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
                <Text size="1" color="gray">
                  Click a month to see its usage detail.
                </Text>
              </Flex>
            )}

            {selectedMonth && (
              <Flex direction="column" gap="5">
                <Box>
                  <Button variant="ghost" onClick={() => setSelectedMonth('')}>
                    ← Back to months
                  </Button>
                </Box>

                <Text size="4" weight="medium">
                  {monthLabel(selectedMonth)}
                </Text>

                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">
                    Usage by resource
                  </Text>
                  <Table.Root className={styles.usageTable}>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Quantity</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {usageByItemForSelectedMonth.map((row) => (
                        <Table.Row key={row.item}>
                          <Table.Cell>
                            <Text size="2" weight="medium">
                              {resourceLabel(row.item)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            {formatQuantity(row.quantity)} {skusBySku.get(row.item)?.unit ?? ''}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Flex>

                <Text size="3" weight="medium">
                  Transactions
                </Text>

                <Flex direction="row" gap="2" align="center" className={styles.filterContainer}>
                  <Box width="220px">
                    <Select.Root size="3" value={selectedItem} onValueChange={setSelectedItem}>
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content position="popper">
                        <Select.Group>
                          <Select.Item value="all">All resources</Select.Item>
                          {itemColumns.map((item) => (
                            <Select.Item key={item} value={item}>
                              {resourceLabel(item)}
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Box>
                </Flex>

                {rawError && (
                  <Callout
                    type="error"
                    message={
                      rawError instanceof Error ? rawError.message : 'Failed to load usage events.'
                    }
                  />
                )}

                {isRawLoading && <LoadingIndicator size="3" />}

                {!isRawLoading && !rawError && filteredRows.length === 0 && (
                  <Callout type="info" message="No usage recorded for this period." />
                )}

                {!isRawLoading && !rawError && filteredRows.length > 0 && (
                  <>
                    <Text size="2" color="gray">
                      {pageCount > 1
                        ? `Showing ${currentPage * PAGE_SIZE + 1}-${Math.min(
                            (currentPage + 1) * PAGE_SIZE,
                            filteredRows.length,
                          )} of ${filteredRows.length} usage events`
                        : `Showing ${filteredRows.length} usage event${filteredRows.length === 1 ? '' : 's'}`}
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
                              Resource {renderSortIcon('item')}
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
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {paginatedRows.map((row) => (
                          <Table.Row key={row.uuid}>
                            <Table.Cell>
                              <Text size="2" weight="medium">
                                {resourceLabel(row.item)}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>{row.quantity}</Table.Cell>
                            <Table.Cell>{skusBySku.get(row.item)?.unit ?? '—'}</Table.Cell>
                            <Table.Cell>
                              {convertDateToUTCString(new Date(row.event_start))}
                            </Table.Cell>
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
              </Flex>
            )}

            <Text size="1" color="gray">
              Quantity per resource — not converted to credits, since there is currently no way to
              look up which pricing category this workspace is in.
            </Text>
          </>
        )}
      </Flex>
    </Flex>
  )
}
