import React, { useMemo, useState, useContext, useEffect } from 'react'
import { Flex, Text, TextField, Tabs, Box, Table, Select, Button, Checkbox } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  fetchAllOrders,
  fetchOrdersForWorkspace,
  fetchMoreOrders,
  OrderFetchResult,
} from '@/services/orderService'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { ChangeWokspaceModal } from '@/components/ChangeWokspaceModal/ChangeWokspaceModal'
import { Callout } from '@/components/Callout/Callout'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { formatOrderDate, OrderData } from '@/library/orderUtils'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { PAGE_SIZE } from '@/hooks/useItemsQuery'
import styles from './MyDataPage.module.scss'

export const MyDataPage: React.FC = () => {
  const { token, updateCurrentWorkspace, currentWorkspace } = useContext(AuthenticationContext)
  const navigate = useNavigate()
  const [isChangeWokspaceModalOpen, setIsChangeWokspaceModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => {
    const stored = localStorage.getItem('ordersPageSelectedWorkspace')
    return stored ?? currentWorkspace ?? 'all'
  })
  const [selectedCollection, setSelectedCollection] = useState('all')
  const [includeFailedOrders, setIncludeFailedOrders] = useState(false) // Default to exclude failed orders
  const [currentPage, setCurrentPage] = useState(0)
  const [allOrders, setAllOrders] = useState<OrderData[]>([])
  const [collectionMetadata, setCollectionMetadata] = useState<
    OrderFetchResult['collectionMetadata']
  >([])
  const [totalItemsMatched, setTotalItemsMatched] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
  }

  // Handle workspace change with localStorage persistence
  const handleWorkspaceChange = (workspace: string) => {
    localStorage.setItem('ordersPageSelectedWorkspace', workspace)
    setSelectedWorkspace(workspace)
  }

  // Sync selectedWorkspace with active workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('ordersPageSelectedWorkspace', currentWorkspace)
      setSelectedWorkspace(currentWorkspace)
    }
  }, [currentWorkspace])

  // Helper function to get collection map URL
  const getCollectionMapUrl = (collectionId: string): string => {
    if (collectionId === 'airbus_phr_data') {
      return '/finder/my-airbus_phr_data'
    } else {
      // Default pattern for all collections including airbus_pneo_data
      return `/finder/my-${collectionId}`
    }
  }

  const handleViewOnMap = (order: OrderData) => {
    const collectionId = order.item.collection

    // CRITICAL: Switch to the workspace where the data was purchased
    updateCurrentWorkspace?.(order.workspace)

    // Store the item to pin after navigation
    localStorage.setItem(
      'itemToPin',
      JSON.stringify({
        item: order.item,
        collectionTitle: order.collectionTitle,
        workspace: order.workspace,
      }),
    )

    // Set flag to automatically open the pinned items tab
    localStorage.setItem('openPinnedItemsTab', 'true')

    // Navigate to the collection's map view
    navigate(getCollectionMapUrl(collectionId))
  }

  const handleViewCollection = (order: OrderData) => {
    const collectionId = order.item.collection

    // CRITICAL: Switch to the workspace where the data was purchased
    updateCurrentWorkspace?.(order.workspace)

    // Navigate to the collection's map view without pinning any item
    navigate(getCollectionMapUrl(collectionId))
  }

  const handleResetFilters = () => {
    localStorage.removeItem('ordersPageSelectedWorkspace')
    setSelectedWorkspace('all')
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
    queryKey: ['Orders', selectedWorkspace, token],
    queryFn: () =>
      selectedWorkspace === 'all'
        ? fetchAllOrders(token!)
        : fetchOrdersForWorkspace(selectedWorkspace, token!),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  // Update local state when orders result changes
  useEffect(() => {
    if (ordersResult) {
      setAllOrders(ordersResult.orders)
      setCollectionMetadata(ordersResult.collectionMetadata)
      setTotalItemsMatched(ordersResult.totalItemsMatched)
    }
  }, [ordersResult])

  // Handle loading more orders
  const handleLoadMore = async () => {
    if (!token || isLoadingMore) return

    // Check if we have collections with more items available
    const collectionsWithMore = collectionMetadata.filter((meta) => meta.hasMore)
    if (collectionsWithMore.length === 0) {
      return
    }

    setIsLoadingMore(true)
    try {
      const moreResult = await fetchMoreOrders(token, collectionMetadata)
      if (moreResult.orders.length > 0) {
        // Append new orders
        setAllOrders((prev) => [...prev, ...moreResult.orders])
        setCollectionMetadata(moreResult.collectionMetadata)
        setTotalItemsMatched(moreResult.totalItemsMatched)
      }
    } catch (error) {
      // Silently handle errors - user can try again if needed
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Reset to first page when workspace changes
  useEffect(() => {
    setCurrentPage(0)
  }, [selectedWorkspace])

  // Fetch all workspaces to populate dropdown
  const { data: allWorkspaces } = useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  // Generate filter options from fetched workspaces and orders data
  const workspaceOptions = useMemo(() => {
    const workspaceSet = new Set<string>()

    // Add workspaces from API
    if (allWorkspaces) {
      allWorkspaces.forEach((ws) => {
        if (ws.name) {
          workspaceSet.add(ws.name)
        }
      })
    }

    // Add workspaces from orders data (in case some aren't in the API response)
    if (allOrders) {
      allOrders.forEach((o) => {
        if (o.workspace && o.workspace.trim() !== '') {
          workspaceSet.add(o.workspace)
        }
      })
    }

    // Always include current workspace if it exists
    if (currentWorkspace) {
      workspaceSet.add(currentWorkspace)
    }

    return ['all', ...Array.from(workspaceSet).sort()]
  }, [allWorkspaces, allOrders, currentWorkspace])

  const collectionOptions = useMemo(() => {
    if (!allOrders) return []
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
    if (!allOrders) return []

    let filtered = allOrders

    // Apply workspace filter (only needed when viewing all workspaces)
    if (selectedWorkspace !== 'all') {
      filtered = filtered.filter((order) => order.workspace === selectedWorkspace)
    }

    // Apply collection filter
    if (selectedCollection !== 'all') {
      filtered = filtered.filter((order) => order.collectionTitle === selectedCollection)
    }

    // Apply status filter - exclude failed orders unless checkbox is checked
    if (!includeFailedOrders) {
      filtered = filtered.filter((order) => order.orderStatus !== 'Failed')
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter((order) => {
        return (
          order.workspace.toLowerCase().includes(searchLower) ||
          order.collectionTitle.toLowerCase().includes(searchLower) ||
          order.orderId.toLowerCase().includes(searchLower) ||
          order.orderStatus.toLowerCase().includes(searchLower) ||
          order.bundle.toLowerCase().includes(searchLower) ||
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          order.country?.toLowerCase().includes(searchLower) ||
          order.license?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Sort by order date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime()
      const dateB = new Date(b.orderDate).getTime()
      return dateB - dateA // Descending order (newest first)
    })
  }, [allOrders, searchText, selectedWorkspace, selectedCollection, includeFailedOrders])

  // Pagination logic
  const pageCount = Math.ceil(filteredOrders.length / PAGE_SIZE)
  const paginatedOrders = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredOrders, currentPage])

  // Check if there are more orders available (must be after filteredOrders is defined)
  const hasMoreOrders = useMemo(() => {
    // Check if any collection has more items available AND has a nextUrl to fetch from
    const collectionsHaveMore = collectionMetadata.some((meta) => meta.hasMore && meta.nextUrl)
    // Also check if totalItemsMatched indicates more items than we've loaded
    const hasMoreByCount =
      totalItemsMatched !== null &&
      totalItemsMatched > filteredOrders.length &&
      filteredOrders.length > 0
    return collectionsHaveMore || hasMoreByCount
  }, [collectionMetadata, totalItemsMatched, filteredOrders.length])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [selectedCollection, includeFailedOrders, searchText])

  return (
    <>
      <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
        <Flex direction="column" gap="3">
          <Text size="7" weight="medium">
            Orders Dashboard
          </Text>
          <Text size="3" color="gray">
            View all your orders across all workspaces
          </Text>
        </Flex>
        <Tabs.Root defaultValue="purchased_data">
          <Flex justify="between">
            <Tabs.List style={{ justifySelf: 'flex-start', fontSize: 16 }}>
              <Tabs.Trigger value="purchased_data">Purchased Data</Tabs.Trigger>
              <Tabs.Trigger value="workflow_outputs">Workflow Outputs</Tabs.Trigger>
            </Tabs.List>
            <TextField.Root
              placeholder="Search"
              value={searchText}
              onChange={handleChange}
              size="3"
            >
              <TextField.Slot>
                <MagnifyingGlassIcon />
              </TextField.Slot>
            </TextField.Root>
          </Flex>

          <Box pt="6">
            <Tabs.Content value="purchased_data">
              <Flex direction="column" gap="5">
                {/* Filter Controls */}
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
                    <Select.Root
                      size="3"
                      value={selectedWorkspace}
                      onValueChange={handleWorkspaceChange}
                    >
                      <Select.Trigger style={{ width: '100%' }} placeholder="Workspace" />
                      <Select.Content position="popper">
                        <Select.Group>
                          <Select.Item value="all">All Workspaces</Select.Item>
                          {workspaceOptions
                            .filter((w) => w !== 'all')
                            .map((workspace) => (
                              <Select.Item key={workspace} value={workspace}>
                                {workspace}
                              </Select.Item>
                            ))}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Box>

                  <Box flexGrow="1" width="160px" flexShrink="0">
                    <Select.Root
                      size="3"
                      value={selectedCollection}
                      onValueChange={setSelectedCollection}
                    >
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
                </Flex>

                {/* Results Count */}
                <Flex justify="between" align="center" mb="3">
                  <Text size="2" color="gray">
                    {pageCount > 1
                      ? `Showing ${currentPage * PAGE_SIZE + 1}-${Math.min(
                          (currentPage + 1) * PAGE_SIZE,
                          filteredOrders.length,
                        )} of ${filteredOrders.length} orders`
                      : `Showing ${filteredOrders.length} orders`}
                    {totalItemsMatched !== null &&
                      totalItemsMatched > filteredOrders.length &&
                      ` (${totalItemsMatched}+ items available)`}
                    {(selectedWorkspace !== 'all' ||
                      selectedCollection !== 'all' ||
                      includeFailedOrders ||
                      searchText.trim()) &&
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
                {paginatedOrders && paginatedOrders.length > 0 && (
                  <>
                    <Table.Root className={styles.ordersTable}>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Workspace</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Collection</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Order Date</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Order Status</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Bundle</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Country</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>License</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Order ID</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>View</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {paginatedOrders.map((order) => (
                          <Table.Row key={`${order.workspace}-${order.orderId}`}>
                            <Table.Cell>{order.workspace}</Table.Cell>
                            <Table.Cell>
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
                            <Table.Cell>{formatOrderDate(order.orderDate)}</Table.Cell>
                            <Table.Cell>{order.orderStatus}</Table.Cell>
                            <Table.Cell>{order.bundle}</Table.Cell>
                            <Table.Cell>{order.country ?? 'N/A'}</Table.Cell>
                            <Table.Cell>{order.license ?? 'N/A'}</Table.Cell>
                            <Table.Cell>{order.orderId}</Table.Cell>
                            <Table.Cell>
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
                            </Table.Cell>
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
                            Load More Orders
                          </Button>
                        )}
                        {totalItemsMatched !== null &&
                          totalItemsMatched > filteredOrders.length && (
                            <Text size="2" color="gray">
                              {filteredOrders.length} of {totalItemsMatched}+ orders loaded
                            </Text>
                          )}
                      </Flex>
                    )}
                  </>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="workflow_outputs">
              <Callout type="info" message="Workflows are not currently supported." />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>

      <ChangeWokspaceModal
        isOpen={isChangeWokspaceModalOpen}
        onClose={() => setIsChangeWokspaceModalOpen(false)}
      />
    </>
  )
}
