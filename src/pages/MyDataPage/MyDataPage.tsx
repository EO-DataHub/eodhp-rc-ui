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
import { fetchJobsForWorkspace } from '@/services/workflowJobService'
import { transformJobForDisplay, sortJobsByCreated } from '@/library/jobUtils'
import { WorkflowJob, JobsApiResponse } from '@/types'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { formatOrderDate, OrderData } from '@/library/orderUtils'
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
import { JobDetailsModal } from '@/components/JobDetailsModal/JobDetailsModal'
import styles from './MyDataPage.module.scss'

export const MyDataPage: React.FC = () => {
  const { token, updateCurrentWorkspace, currentWorkspace } = useContext(AuthenticationContext)
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => {
    const stored = localStorage.getItem('ordersPageSelectedWorkspace')
    return stored ?? currentWorkspace ?? 'all'
  })
  const [workflowOutputsSelectedWorkspace, setWorkflowOutputsSelectedWorkspace] = useState<string>(
    () => {
      const stored = localStorage.getItem('workflowOutputsPageSelectedWorkspace')
      return stored ?? currentWorkspace ?? 'all'
    },
  )
  const [selectedCollection, setSelectedCollection] = useState('all')
  const [includeFailedOrders, setIncludeFailedOrders] = useState(false) // Default to exclude failed orders
  const [currentPage, setCurrentPage] = useState(0)
  const [allOrders, setAllOrders] = useState<OrderData[]>([])
  const [collectionMetadata, setCollectionMetadata] = useState<
    OrderFetchResult['collectionMetadata']
  >([])
  const [totalItemsMatched, setTotalItemsMatched] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => loadColumnConfig())

  // Workflow outputs state
  const [allJobs, setAllJobs] = useState<WorkflowJob[]>([])
  const [workflowJobsPage, setWorkflowJobsPage] = useState(0)
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'successful' | 'failed' | 'running'>(
    'all',
  )
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)

  // Load column config on mount
  useEffect(() => {
    setColumnConfig(loadColumnConfig())
  }, [])

  // Save column config when it changes
  const handleColumnConfigChange = (config: ColumnConfig[]) => {
    setColumnConfig(config)
    saveColumnConfig(config)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
  }

  // Handle workspace change with localStorage persistence
  const handleWorkspaceChange = (workspace: string) => {
    localStorage.setItem('ordersPageSelectedWorkspace', workspace)
    setSelectedWorkspace(workspace)
  }

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
    const itemToPinData = {
      item: order.item,
      collectionTitle: order.collectionTitle,
      workspace: order.workspace,
    }
    localStorage.setItem('itemToPin', JSON.stringify(itemToPinData))

    // Set flag to automatically open the pinned items tab
    localStorage.setItem('openPinnedItemsTab', 'true')

    // Navigate to the collection's map view
    const targetUrl = getCollectionMapUrl(collectionId)
    void navigate(targetUrl)
  }

  const handleViewCollection = (order: OrderData) => {
    const collectionId = order.item.collection

    // CRITICAL: Switch to the workspace where the data was purchased
    updateCurrentWorkspace?.(order.workspace)

    // Navigate to the collection's map view without pinning any item
    void navigate(getCollectionMapUrl(collectionId))
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
    queryFn: (): Promise<OrderFetchResult> => {
      if (!token) {
        return Promise.resolve({
          orders: [],
          totalItemsMatched: null,
          hasMore: false,
          collectionMetadata: [],
        })
      }

      const result: Promise<OrderFetchResult> =
        selectedWorkspace === 'all'
          ? fetchAllOrders(token)
          : fetchOrdersForWorkspace(selectedWorkspace, token)

      return result
    },
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
    const collectionsWithMore = collectionMetadata.filter((meta) => Boolean(meta.hasMore))
    if (collectionsWithMore.length === 0) {
      return
    }

    setIsLoadingMore(true)
    try {
      const moreResult: OrderFetchResult = await fetchMoreOrders(token, collectionMetadata)
      const moreOrders: OrderData[] = moreResult.orders
      if (moreResult.orders.length > 0) {
        // Append new orders
        setAllOrders((prev) => [...prev, ...moreOrders])
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

  // Fetch workflow jobs for selected workspace (use workflow-specific workspace state)
  const workflowWorkspace =
    workflowOutputsSelectedWorkspace === 'all'
      ? currentWorkspace ?? ''
      : workflowOutputsSelectedWorkspace
  const {
    data: jobsResponse,
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<JobsApiResponse>({
    queryKey: ['WorkflowJobs', workflowWorkspace, token],
    queryFn: (): Promise<JobsApiResponse> => {
      if (!token || !workflowWorkspace) {
        return Promise.resolve({
          jobs: [],
          links: [],
          numberTotal: 0,
        })
      }
      return fetchJobsForWorkspace(workflowWorkspace, token)
    },
    refetchOnWindowFocus: false,
    enabled: !!token && !!workflowWorkspace,
  })

  // Update local state when jobs result changes
  useEffect(() => {
    if (jobsResponse) {
      const sortedJobs = sortJobsByCreated(jobsResponse.jobs)
      setAllJobs(sortedJobs)
    }
  }, [jobsResponse])

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
          order.itemTitle.toLowerCase().includes(searchLower) ||
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

  // Calculate filtered totalItemsMatched based on filtered orders
  // When filters exclude orders (e.g., failed orders), totalItemsMatched should reflect filtered count
  const filteredTotalItemsMatched = useMemo(() => {
    // If no filters are applied that would exclude orders, use the original totalItemsMatched
    // The only filter that excludes orders is includeFailedOrders=false (which excludes failed orders)
    if (includeFailedOrders || totalItemsMatched === null) {
      return totalItemsMatched
    }

    // When failed orders are excluded, use the filtered orders count as the total
    // This ensures "X+ items available" reflects what's actually visible
    return filteredOrders.length
  }, [filteredOrders.length, includeFailedOrders, totalItemsMatched])

  // Pagination logic
  const pageCount = Math.ceil(filteredOrders.length / PAGE_SIZE)
  const paginatedOrders = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredOrders, currentPage])

  // Check if there are more orders available (must be after filteredOrders is defined)
  const hasMoreOrders = useMemo(() => {
    // Check if any collection has more items available AND has a nextUrl to fetch from
    const collectionsHaveMore = collectionMetadata.some((meta) =>
      Boolean(meta.hasMore && meta.nextUrl),
    )
    // Also check if totalItemsMatched indicates more items than we've loaded
    const hasMoreByCount =
      totalItemsMatched !== null &&
      totalItemsMatched > filteredOrders.length &&
      filteredOrders.length > 0
    return Boolean(collectionsHaveMore || hasMoreByCount)
  }, [collectionMetadata, totalItemsMatched, filteredOrders.length])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [selectedCollection, includeFailedOrders, searchText])

  // Filter and transform workflow jobs for display
  const filteredJobs = useMemo(() => {
    if (!allJobs) return []

    let filtered = allJobs

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((job) => job.status === selectedStatus)
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter((job) => {
        return (
          job.id.toLowerCase().includes(searchLower) ||
          job.jobID.toLowerCase().includes(searchLower) ||
          job.processID.toLowerCase().includes(searchLower) ||
          job.message.toLowerCase().includes(searchLower)
        )
      })
    }

    return filtered
  }, [allJobs, searchText, selectedStatus])

  // Transform jobs for display
  const displayJobs = useMemo(() => {
    const workspace = workflowWorkspace || ''
    return filteredJobs.map((job) => transformJobForDisplay(job, workspace))
  }, [filteredJobs, workflowWorkspace])

  // Pagination for workflow jobs
  const workflowJobsPageCount = Math.ceil(displayJobs.length / PAGE_SIZE)
  const paginatedJobs = useMemo(() => {
    const startIndex = workflowJobsPage * PAGE_SIZE
    return displayJobs.slice(startIndex, startIndex + PAGE_SIZE)
  }, [displayJobs, workflowJobsPage])

  // Reset workflow jobs page when filters change
  useEffect(() => {
    setWorkflowJobsPage(0)
  }, [selectedStatus, searchText, workflowOutputsSelectedWorkspace])

  // Get visible columns sorted by order
  const visibleColumns = useMemo(() => getVisibleColumns(columnConfig), [columnConfig])

  // Render cell content for each column type
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
        )
      default:
        return null
    }
  }

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
                  <Box flexGrow="0" flexShrink="0">
                    <ColumnSelector
                      columns={columnConfig}
                      onColumnsChange={handleColumnConfigChange}
                    />
                  </Box>
                </Flex>

                {/* Results Count */}
                <Flex justify="between" align="center" mb="3">
                  <Text size="2" color="gray">
                    {(() => {
                      // Determine the total count to display
                      // If there are more orders available, use filteredTotalItemsMatched if available, otherwise use totalItemsMatched
                      // Otherwise use the current filtered orders count
                      let totalCount = filteredOrders.length
                      let showMoreIndicator = false

                      if (hasMoreOrders) {
                        // If filteredTotalItemsMatched is available and greater, use it
                        if (
                          filteredTotalItemsMatched !== null &&
                          filteredTotalItemsMatched > filteredOrders.length
                        ) {
                          totalCount = filteredTotalItemsMatched
                        } else if (
                          totalItemsMatched !== null &&
                          totalItemsMatched > filteredOrders.length
                        ) {
                          // Otherwise use totalItemsMatched if available
                          totalCount = totalItemsMatched
                        } else {
                          // If we know there are more but don't have exact count, show indicator
                          totalCount = filteredOrders.length
                          showMoreIndicator = true
                        }
                      }

                      // Show range format when there are multiple pages OR when there are more orders available
                      if (pageCount > 1 || hasMoreOrders) {
                        const startIndex = currentPage * PAGE_SIZE + 1
                        const endIndex = Math.min(
                          (currentPage + 1) * PAGE_SIZE,
                          filteredOrders.length,
                        )
                        const countDisplay = showMoreIndicator ? `${totalCount}+` : totalCount
                        return `Showing ${startIndex}-${endIndex} of ${countDisplay} orders`
                      }

                      // Single page with no more orders available
                      return `Showing ${filteredOrders.length} orders`
                    })()}
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
                              {filteredOrders.length} of {filteredTotalItemsMatched}+ orders
                              available
                            </Text>
                          )}
                      </Flex>
                    )}
                  </>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="workflow_outputs">
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
                      value={workflowOutputsSelectedWorkspace}
                      onValueChange={(workspace) => {
                        localStorage.setItem('workflowOutputsPageSelectedWorkspace', workspace)
                        setWorkflowOutputsSelectedWorkspace(workspace)
                      }}
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
                      value={selectedStatus}
                      onValueChange={(value) =>
                        setSelectedStatus(value as 'all' | 'successful' | 'failed' | 'running')
                      }
                    >
                      <Select.Trigger style={{ width: '100%' }} placeholder="Status" />
                      <Select.Content position="popper">
                        <Select.Group>
                          <Select.Item value="all">All Statuses</Select.Item>
                          <Select.Item value="successful">Successful</Select.Item>
                          <Select.Item value="failed">Failed</Select.Item>
                          <Select.Item value="running">Running</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Box>

                  <Box flexGrow="0" flexShrink="0">
                    <Button
                      size="3"
                      variant="soft"
                      color="gray"
                      onClick={() => {
                        setSelectedStatus('all')
                        setSearchText('')
                        const resetWorkspace = currentWorkspace ?? 'all'
                        localStorage.setItem('workflowOutputsPageSelectedWorkspace', resetWorkspace)
                        setWorkflowOutputsSelectedWorkspace(resetWorkspace)
                      }}
                      style={{ minWidth: '160px' }}
                    >
                      Reset Filters
                    </Button>
                  </Box>
                </Flex>

                {/* Results Count */}
                <Flex justify="between" align="center" mb="3">
                  <Text size="2" color="gray">
                    {workflowJobsPageCount > 1
                      ? `Showing ${workflowJobsPage * PAGE_SIZE + 1}-${Math.min(
                          (workflowJobsPage + 1) * PAGE_SIZE,
                          displayJobs.length,
                        )} of ${displayJobs.length} jobs`
                      : `Showing ${displayJobs.length} job${displayJobs.length !== 1 ? 's' : ''}`}
                    {(selectedStatus !== 'all' || searchText.trim()) && ' (filtered)'}
                  </Text>
                </Flex>

                {isLoadingJobs ? (
                  <LoadingIndicator size="3" />
                ) : (
                  (jobsError ?? displayJobs.length === 0) && (
                    <Callout
                      type={jobsError ? 'error' : 'info'}
                      message={
                        jobsError
                          ? jobsError instanceof Error
                            ? jobsError.message
                            : 'Unable to load workflow outputs. Please try again later.'
                          : 'You currently have no workflow outputs. Your workflow execution jobs will appear here once you run a workflow.'
                      }
                    />
                  )
                )}

                {paginatedJobs.length > 0 && (
                  <>
                    <Table.Root className={styles.ordersTable}>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Job ID</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Process ID</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Created Date</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Finished Date</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {paginatedJobs.map((displayJob) => {
                          const job = allJobs.find((j) => j.id === displayJob.id)
                          return (
                            <Table.Row
                              key={displayJob.id}
                              onClick={() => {
                                if (job) {
                                  setSelectedJob(job)
                                  setIsJobModalOpen(true)
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <Table.Cell>
                                <Text size="1" style={{ fontFamily: 'monospace' }}>
                                  {displayJob.id}
                                </Text>
                              </Table.Cell>
                              <Table.Cell>{displayJob.processID}</Table.Cell>
                              <Table.Cell>{displayJob.status}</Table.Cell>
                              <Table.Cell>{displayJob.createdFormatted}</Table.Cell>
                              <Table.Cell>{displayJob.finishedFormatted}</Table.Cell>
                            </Table.Row>
                          )
                        })}
                      </Table.Body>
                    </Table.Root>
                    {workflowJobsPageCount > 1 && (
                      <Flex justify="center" mt="auto">
                        <PageSelector
                          currentPageIndex={workflowJobsPage}
                          nextDisabled={workflowJobsPage === workflowJobsPageCount - 1}
                          onGoToPage={setWorkflowJobsPage}
                          onNextClick={() => setWorkflowJobsPage(workflowJobsPage + 1)}
                          onPreviousClick={() => setWorkflowJobsPage(workflowJobsPage - 1)}
                          pageCount={workflowJobsPageCount}
                          previousDisabled={workflowJobsPage === 0}
                        />
                      </Flex>
                    )}
                  </>
                )}
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
        <JobDetailsModal job={selectedJob} open={isJobModalOpen} onOpenChange={setIsJobModalOpen} />
      </Flex>
    </>
  )
}
