import React, { useMemo, useState, useContext, useEffect } from 'react'
import {
  Flex,
  Text,
  TextField,
  Box,
  Table,
  Select,
  Button,
  Checkbox,
  Tooltip,
} from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { fetchOrdersForWorkspace, fetchMoreOrders, OrderFetchResult } from '@/services/orderService'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { formatOrderDate, OrderData } from '@/library/orderUtils'
import { getItemDownloadUrl } from '@/library/catalogUtils'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import {
  ColumnConfig,
  ColumnId,
  loadColumnConfig,
  saveColumnConfig,
  getVisibleColumns,
} from '@/library/columnConfig'
import { ColumnSelector } from '@/components/ColumnSelector/ColumnSelector'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from '../MyDataPage/MyDataPage.module.scss'

export const PurchasedDataPage: React.FC = () => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [selectedCollection, setSelectedCollection] = useState('all')
  const [includeFailedOrders, setIncludeFailedOrders] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [allOrders, setAllOrders] = useState<OrderData[]>([])
  const [collectionMetadata, setCollectionMetadata] = useState<
    OrderFetchResult['collectionMetadata']
  >([])
  const [totalItemsMatched, setTotalItemsMatched] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => loadColumnConfig())

  useEffect(() => {
    setColumnConfig(loadColumnConfig())
  }, [])

  const handleColumnConfigChange = (config: ColumnConfig[]) => {
    setColumnConfig(config)
    saveColumnConfig(config)
  }

  const getCollectionMapUrl = (collectionId: string): string => {
    if (collectionId === 'airbus_phr_data') {
      return '/finder/my-airbus_phr_data'
    }
    return `/finder/my-${collectionId}`
  }

  const handleViewOnMap = (order: OrderData) => {
    const collectionId = order.item.collection
    const itemToPinData = {
      item: order.item,
      collectionTitle: order.collectionTitle,
      workspace: order.workspace,
    }
    localStorage.setItem('itemToPin', JSON.stringify(itemToPinData))
    localStorage.setItem('openPinnedItemsTab', 'true')
    void navigate(getCollectionMapUrl(collectionId))
  }

  const handleViewCollection = (order: OrderData) => {
    const collectionId = order.item.collection
    void navigate(getCollectionMapUrl(collectionId))
  }

  const handleResetFilters = () => {
    setSelectedCollection('all')
    setIncludeFailedOrders(false)
    setSearchText('')
    setCurrentPage(0)
  }

  const {
    data: ordersResult,
    isLoading,
    error,
  } = useQuery<OrderFetchResult>({
    queryKey: ['Orders', currentWorkspace, userInfo?.sub],
    queryFn: (): Promise<OrderFetchResult> => {
      if (!token || !currentWorkspace) {
        return Promise.resolve({
          orders: [],
          totalItemsMatched: null,
          hasMore: false,
          collectionMetadata: [],
        })
      }
      return fetchOrdersForWorkspace(currentWorkspace, token)
    },
    refetchOnWindowFocus: false,
    enabled: !!token && !!currentWorkspace && !!userInfo?.sub,
  })

  useEffect(() => {
    if (ordersResult) {
      setAllOrders(ordersResult.orders)
      setCollectionMetadata(ordersResult.collectionMetadata)
      setTotalItemsMatched(ordersResult.totalItemsMatched)
    }
  }, [ordersResult])

  const handleLoadMore = async () => {
    if (!token || isLoadingMore) return
    const collectionsWithMore = collectionMetadata.filter((meta) => Boolean(meta.hasMore))
    if (collectionsWithMore.length === 0) return
    setIsLoadingMore(true)
    try {
      const moreResult: OrderFetchResult = await fetchMoreOrders(token, collectionMetadata)
      if (moreResult.orders.length > 0) {
        setAllOrders((prev) => [...prev, ...moreResult.orders])
        setCollectionMetadata(moreResult.collectionMetadata)
        setTotalItemsMatched(moreResult.totalItemsMatched)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    setCurrentPage(0)
  }, [currentWorkspace])

  const collectionOptions = useMemo(() => {
    return [
      'all',
      ...new Set(
        allOrders
          .map((o) => o.collectionTitle)
          .filter((c): c is string => Boolean(c) && c.trim() !== ''),
      ),
    ]
  }, [allOrders])

  const filteredOrders = useMemo(() => {
    let filtered = allOrders
    if (selectedCollection !== 'all') {
      filtered = filtered.filter((order) => order.collectionTitle === selectedCollection)
    }
    if (!includeFailedOrders) {
      filtered = filtered.filter((order) => order.orderStatus !== 'Failed')
    }
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.workspace.toLowerCase().includes(searchLower) ||
          order.collectionTitle.toLowerCase().includes(searchLower) ||
          order.itemTitle.toLowerCase().includes(searchLower) ||
          order.orderId.toLowerCase().includes(searchLower) ||
          order.orderStatus.toLowerCase().includes(searchLower) ||
          order.bundle.toLowerCase().includes(searchLower) ||
          (order.country?.toLowerCase().includes(searchLower) ?? false) ||
          (order.license?.toLowerCase().includes(searchLower) ?? false),
      )
    }
    return filtered.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime()
      const dateB = new Date(b.orderDate).getTime()
      return dateB - dateA
    })
  }, [allOrders, searchText, selectedCollection, includeFailedOrders])

  const filteredTotalItemsMatched = useMemo(() => {
    if (includeFailedOrders || totalItemsMatched === null) return totalItemsMatched
    return filteredOrders.length
  }, [filteredOrders.length, includeFailedOrders, totalItemsMatched])

  const pageCount = Math.ceil(filteredOrders.length / PAGE_SIZE)
  const paginatedOrders = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredOrders, currentPage])

  const hasMoreOrders = useMemo(() => {
    const collectionsHaveMore = collectionMetadata.some((meta) =>
      Boolean(meta.hasMore && meta.nextUrl),
    )
    const hasMoreByCount =
      totalItemsMatched !== null &&
      totalItemsMatched > filteredOrders.length &&
      filteredOrders.length > 0
    return Boolean(collectionsHaveMore || hasMoreByCount)
  }, [collectionMetadata, totalItemsMatched, filteredOrders.length])

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedCollection, includeFailedOrders, searchText])

  const visibleColumns = useMemo(() => getVisibleColumns(columnConfig), [columnConfig])

  const renderCell = (columnId: ColumnId, order: OrderData) => {
    switch (columnId) {
      case ColumnId.WORKSPACE:
        return <Table.Cell data-column-id={columnId}>{order.workspace}</Table.Cell>
      case ColumnId.COLLECTION:
        return (
          <Table.Cell data-column-id={columnId}>
            <button
              onClick={() => handleViewCollection(order)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-9)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              {order.collectionTitle}
            </button>
          </Table.Cell>
        )
      case ColumnId.ORDER_DATE:
        return <Table.Cell data-column-id={columnId}>{formatOrderDate(order.orderDate)}</Table.Cell>
      case ColumnId.ORDER_STATUS:
        return <Table.Cell data-column-id={columnId}>{order.orderStatus}</Table.Cell>
      case ColumnId.BUNDLE:
        return <Table.Cell data-column-id={columnId}>{order.bundle}</Table.Cell>
      case ColumnId.COUNTRY:
        return <Table.Cell data-column-id={columnId}>{order.country ?? 'N/A'}</Table.Cell>
      case ColumnId.LICENSE:
        return <Table.Cell data-column-id={columnId}>{order.license ?? 'N/A'}</Table.Cell>
      case ColumnId.TITLE:
        return (
          <Table.Cell data-column-id={columnId}>
            <Text size="2" weight="medium">
              {order.itemTitle}
            </Text>
          </Table.Cell>
        )
      case ColumnId.DESCRIPTION:
        return (
          <Table.Cell data-column-id={columnId}>
            {order.item.properties.description ? (
              <Text size="2" color="gray">
                {order.item.properties.description}
              </Text>
            ) : (
              <Text size="2" color="gray">
                N/A
              </Text>
            )}
          </Table.Cell>
        )
      case ColumnId.ORDER_ID:
        return (
          <Table.Cell data-column-id={columnId}>
            <Text size="1" style={{ fontFamily: 'monospace' }}>
              {order.orderId}
            </Text>
          </Table.Cell>
        )
      case ColumnId.DATE: {
        const dateValue = order.item.properties.datetime ?? order.item.properties.start_datetime
        return (
          <Table.Cell data-column-id={columnId}>
            {dateValue ? (
              formatOrderDate(dateValue)
            ) : (
              <Text size="2" color="gray">
                N/A
              </Text>
            )}
          </Table.Cell>
        )
      }
      case ColumnId.VIEW:
        return (
          <Table.Cell data-column-id={columnId}>
            <Flex gap="3" align="center">
              <button
                onClick={() => handleViewOnMap(order)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-9)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  padding: 0,
                }}
              >
                View on map
              </button>
              {order.item.properties['order:status'] === 'succeeded' ? (
                <RouterLink
                  to={getItemDownloadUrl({
                    collectionPath: `my-${order.item.collection}`,
                    itemId: order.item.id,
                    workspace: order.workspace,
                    from: 'purchased',
                  })}
                  style={{ color: 'var(--accent-9)' }}
                >
                  Download
                </RouterLink>
              ) : (
                <Tooltip content="Available once the order is delivered">
                  <Text color="gray" style={{ cursor: 'not-allowed' }}>
                    Download
                  </Text>
                </Tooltip>
              )}
            </Flex>
          </Table.Cell>
        )
      default:
        return null
    }
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading title="Purchased Data" subtitle="View all your orders in this workspace" />
      <Flex justify="between" align="center">
        <Box />
        <TextField.Root
          placeholder="Search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="3"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      </Flex>
      <Flex direction="column" gap="5">
        <Flex
          p="5"
          direction="row"
          gap="2"
          align="center"
          justify="between"
          className={styles.filterContainer}
          overflow="auto"
        >
          <Box flexGrow="1" width="160px" flexShrink="0">
            <Select.Root size="3" value={selectedCollection} onValueChange={setSelectedCollection}>
              <Select.Trigger style={{ width: '100%' }} placeholder="Collection" />
              <Select.Content position="popper">
                <Select.Group>
                  <Select.Item value="all">All Collections</Select.Item>
                  {collectionOptions
                    .filter((c) => c !== 'all')
                    .map((collection) => (
                      <Select.Item key={collection} value={collection}>
                        {collection}
                      </Select.Item>
                    ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>
          <Box flexGrow="1" width="160px" flexShrink="0">
            <Flex align="center" gap="2" height="100%">
              <Checkbox
                size="3"
                checked={includeFailedOrders}
                onCheckedChange={(checked) => setIncludeFailedOrders(checked as boolean)}
              />
              <Text as="label" size="3" style={{ cursor: 'pointer' }}>
                Include Failed Orders
              </Text>
            </Flex>
          </Box>
          <Box flexGrow="0" flexShrink="0">
            <Button
              size="3"
              variant="soft"
              color="gray"
              onClick={handleResetFilters}
              style={{ minWidth: '160px' }}
            >
              Reset Filters
            </Button>
          </Box>
          <Box flexGrow="0" flexShrink="0">
            <ColumnSelector columns={columnConfig} onColumnsChange={handleColumnConfigChange} />
          </Box>
        </Flex>
        <Flex justify="between" align="center" mb="3">
          <Text size="2" color="gray">
            {(() => {
              let totalCount = filteredOrders.length
              let showMoreIndicator = false
              if (hasMoreOrders) {
                if (
                  filteredTotalItemsMatched !== null &&
                  filteredTotalItemsMatched > filteredOrders.length
                ) {
                  totalCount = filteredTotalItemsMatched
                } else if (
                  totalItemsMatched !== null &&
                  totalItemsMatched > filteredOrders.length
                ) {
                  totalCount = totalItemsMatched
                } else {
                  totalCount = filteredOrders.length
                  showMoreIndicator = true
                }
              }
              if (pageCount > 1 || hasMoreOrders) {
                const startIndex = currentPage * PAGE_SIZE + 1
                const endIndex = Math.min((currentPage + 1) * PAGE_SIZE, filteredOrders.length)
                const countDisplay = showMoreIndicator ? `${totalCount}+` : totalCount
                return `Showing ${startIndex}-${endIndex} of ${countDisplay} orders`
              }
              return `Showing ${filteredOrders.length} orders`
            })()}
            {(selectedCollection !== 'all' || includeFailedOrders || searchText.trim()) &&
              ' (filtered)'}
          </Text>
        </Flex>
        {isLoading ? (
          <LoadingIndicator size="3" />
        ) : (
          (error ?? filteredOrders?.length === 0) && (
            <Callout
              type="info"
              message="You currently have no orders. Your order details will appear here once you make a purchase."
            />
          )
        )}
        {paginatedOrders.length > 0 && (
          <>
            <Table.Root className={styles.ordersTable}>
              <Table.Header>
                <Table.Row>
                  {visibleColumns.map((column) => (
                    <Table.ColumnHeaderCell key={column.id} data-column-id={column.id}>
                      {column.label}
                    </Table.ColumnHeaderCell>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedOrders.map((order) => (
                  <Table.Row key={`${order.workspace}-${order.orderId}`}>
                    {visibleColumns.map((column) => (
                      <React.Fragment key={column.id}>
                        {renderCell(column.id, order)}
                      </React.Fragment>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
            {pageCount > 1 && (
              <Flex justify="center" mt="auto">
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
            {hasMoreOrders && (
              <Flex justify="center" mt="4" direction="column" align="center" gap="2">
                {isLoadingMore ? (
                  <LoadingIndicator size="3" />
                ) : (
                  <Button
                    size="3"
                    variant="soft"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore || isLoading}
                  >
                    Load More Pages
                  </Button>
                )}
                {filteredTotalItemsMatched !== null &&
                  filteredTotalItemsMatched > filteredOrders.length && (
                    <Text size="2" color="gray">
                      {filteredOrders.length} of {filteredTotalItemsMatched}+ orders available
                    </Text>
                  )}
              </Flex>
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
