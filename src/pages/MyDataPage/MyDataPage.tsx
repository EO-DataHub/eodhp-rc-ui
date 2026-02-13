import React, { useMemo, useState, useContext, useEffect } from 'react'
import {
  Flex,
  Text,
  TextField,
  Tabs,
  Box,
  Table,
  Select,
  Button,
  Checkbox,
  Progress,
} from '@radix-ui/themes'
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
import { Callout } from '@/components/Callout/Callout'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon, UploadIcon } from '@radix-ui/react-icons'
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
import { useDropzone } from 'react-dropzone'
import {
  deleteWorkspaceFile,
  listWorkspaceFiles,
  uploadWorkspaceFiles,
  StoreType,
  WorkspaceFileItem,
  WorkspaceFileListResponse,
} from '@/services/workspaceFilesService'
import { formatFileDateTime, formatFileSize } from '@/library/fileUtils'
import DeleteIcon from '@/assets/icons/trash.svg?react'
import styles from './MyDataPage.module.scss'

export const MyDataPage: React.FC = () => {
  const { token, updateCurrentWorkspace, currentWorkspace } = useContext(AuthenticationContext)
  const navigate = useNavigate()
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
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => loadColumnConfig())
  const [activeTab, setActiveTab] = useState('purchased_data')
  const [dataWorkspace, setDataWorkspace] = useState<string>(() => {
    const stored = localStorage.getItem('dataStorageSelectedWorkspace')
    return stored ?? currentWorkspace ?? ''
  })
  const [dataStoreFilter, setDataStoreFilter] = useState<'all' | StoreType>('all')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null)

  // Load column config on mount
  useEffect(() => {
    setColumnConfig(loadColumnConfig())
  }, [])

  // Default to the current workspace when the data tab first loads and no selection exists yet.
  useEffect(() => {
    if (!dataWorkspace && currentWorkspace) {
      setDataWorkspace(currentWorkspace)
    }
  }, [currentWorkspace, dataWorkspace])

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

  const handleDataWorkspaceChange = (workspace: string) => {
    localStorage.setItem('dataStorageSelectedWorkspace', workspace)
    setDataWorkspace(workspace)
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

  const dataWorkspaceOptions = useMemo(() => {
    return workspaceOptions.filter((workspace) => workspace !== 'all')
  }, [workspaceOptions])

  // If no workspace is selected yet, default to the first available option
  useEffect(() => {
    if (!dataWorkspace && dataWorkspaceOptions.length > 0) {
      setDataWorkspace(dataWorkspaceOptions[0])
    }
  }, [dataWorkspace, dataWorkspaceOptions])

  // Clear stale upload messages when the workspace or store filter changes
  useEffect(() => {
    setUploadSuccess(null)
    setUploadError(null)
  }, [dataWorkspace, dataStoreFilter])

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

  const storeParam = dataStoreFilter === 'all' ? undefined : dataStoreFilter

  const {
    data: filesResult,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery<WorkspaceFileListResponse>({
    queryKey: ['WorkspaceFiles', dataWorkspace, dataStoreFilter, token],
    queryFn: () => listWorkspaceFiles(dataWorkspace, token ?? '', storeParam),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && dataWorkspace && activeTab === 'data_storage'),
  })

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

  // Derive visible files: filter by store + search term, then sort by most recent.
  const filteredFiles = useMemo(() => {
    const items = filesResult?.items ?? []
    const searchLower = searchText.trim().toLowerCase()
    let filtered = items

    if (dataStoreFilter !== 'all') {
      filtered = filtered.filter((item) => item.storeType === dataStoreFilter)
    }
    if (searchLower) {
      filtered = filtered.filter((item) => item.fileName.toLowerCase().includes(searchLower))
    }
    return [...filtered].sort((a, b) => {
      const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0
      const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0
      return dateB - dateA
    })
  }, [filesResult, searchText, dataStoreFilter])

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

  const canUpload = Boolean(token && dataWorkspace && dataStoreFilter !== 'all')

  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    if (!token) {
      setUploadError('You must be signed in to upload files.')
      return
    }
    if (!dataWorkspace) {
      setUploadError('Select a workspace to upload files.')
      return
    }
    if (dataStoreFilter === 'all') {
      setUploadError('Select a store type to upload files.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      await uploadWorkspaceFiles(dataWorkspace, token, dataStoreFilter, acceptedFiles, (progress) =>
        setUploadProgress(progress),
      )
      setUploadSuccess(
        `Uploaded ${acceptedFiles.length} file${acceptedFiles.length === 1 ? '' : 's'}.`,
      )
      await refetchFiles()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleDeleteFile = async (item: WorkspaceFileItem) => {
    if (!token) {
      setUploadError('You must be signed in to delete files.')
      return
    }
    if (!dataWorkspace) {
      setUploadError('Select a workspace to delete files.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    const deletingKey = `${item.storeType}:${item.fileName}`
    setDeletingFileKey(deletingKey)

    try {
      await deleteWorkspaceFile(dataWorkspace, token, item.storeType, item.fileName)
      setUploadSuccess(`Deleted ${item.fileName}`)
      await refetchFiles()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Delete failed.')
    } finally {
      setDeletingFileKey(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    disabled: !canUpload || isUploading,
  })

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
        <Tabs.Root defaultValue="purchased_data" value={activeTab} onValueChange={setActiveTab}>
          <Flex justify="between">
            <Tabs.List style={{ justifySelf: 'flex-start', fontSize: 16 }}>
              <Tabs.Trigger value="purchased_data">Purchased Data</Tabs.Trigger>
              <Tabs.Trigger value="data_storage">Data storage</Tabs.Trigger>
              <Tabs.Trigger value="workflow_outputs">Workflow Outputs</Tabs.Trigger>
            </Tabs.List>
            <TextField.Root
              placeholder={activeTab === 'data_storage' ? 'Search files' : 'Search'}
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

            <Tabs.Content value="data_storage">
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
                  <Box flexGrow="1" width="200px" flexShrink="0">
                    <Select.Root
                      size="3"
                      value={dataWorkspace}
                      onValueChange={handleDataWorkspaceChange}
                    >
                      <Select.Trigger style={{ width: '100%' }} placeholder="Workspace" />
                      <Select.Content position="popper">
                        <Select.Group>
                          {dataWorkspaceOptions.map((workspace) => (
                            <Select.Item key={workspace} value={workspace}>
                              {workspace}
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Box>

                  <Box flexGrow="1" width="200px" flexShrink="0">
                    <Select.Root
                      size="3"
                      value={dataStoreFilter}
                      onValueChange={(value) => setDataStoreFilter(value as 'all' | StoreType)}
                    >
                      <Select.Trigger style={{ width: '100%' }} placeholder="Store type" />
                      <Select.Content position="popper">
                        <Select.Group>
                          <Select.Item value="all">All stores</Select.Item>
                          <Select.Item value="object">Object store</Select.Item>
                          <Select.Item value="block">Block store</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Box>
                </Flex>

                {uploadError && <Callout type="error" message={uploadError} />}
                {uploadSuccess && <Callout type="info" message={uploadSuccess} />}

                <Box
                  {...getRootProps()}
                  className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''} ${
                    !canUpload || isUploading ? styles.dropzoneDisabled : ''
                  }`}
                >
                  <input {...getInputProps()} />
                  <Flex direction="column" gap="2" align="center">
                    <UploadIcon />
                    <Text size="3" weight="medium">
                      Drag and drop files here
                    </Text>
                    <Text size="2" color="gray">
                      or click to select files
                    </Text>
                    {!canUpload && (
                      <Text size="2" color="gray">
                        Select a workspace and store type to enable uploads.
                      </Text>
                    )}
                  </Flex>
                </Box>

                {isUploading && (
                  <Flex direction="column" gap="2">
                    <Progress value={uploadProgress ?? 0} />
                    <Text size="2" color="gray">
                      {uploadProgress ?? 0}%
                    </Text>
                  </Flex>
                )}

                {!token && <Callout type="info" message="Sign in to view workspace files." />}

                {filesLoading ? (
                  <LoadingIndicator size="3" />
                ) : (
                  filesError && (
                    <Callout
                      type="error"
                      message={
                        filesError instanceof Error
                          ? filesError.message
                          : 'Failed to load workspace files.'
                      }
                    />
                  )
                )}

                {!filesLoading && !filesError && dataWorkspace && (
                  <>
                    <Flex justify="between" align="center" mb="3">
                      <Text size="2" color="gray">
                        {filteredFiles.length === 1
                          ? 'Showing 1 file'
                          : `Showing ${filteredFiles.length} files`}
                      </Text>
                    </Flex>

                    {filteredFiles.length === 0 ? (
                      <Callout type="info" message="No files found for this workspace." />
                    ) : (
                      <Table.Root className={`${styles.ordersTable} ${styles.filesTable}`}>
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell data-column-id="fileName">
                              File name
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell data-column-id="storeType">
                              Store
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell data-column-id="size">
                              Size
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell data-column-id="lastModified">
                              Last modified
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell data-column-id="delete">
                              Delete
                            </Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {filteredFiles.map((item: WorkspaceFileItem) => (
                            <Table.Row key={`${item.storeType}-${item.fileName}`}>
                              <Table.Cell data-column-id="fileName">
                                <Text size="2" weight="medium">
                                  {item.fileName}
                                </Text>
                              </Table.Cell>
                              <Table.Cell data-column-id="storeType">
                                {item.storeType === 'object' ? 'Object' : 'Block'}
                              </Table.Cell>
                              <Table.Cell data-column-id="size">
                                {formatFileSize(item.size)}
                              </Table.Cell>
                              <Table.Cell data-column-id="lastModified">
                                {formatFileDateTime(item.lastModified)}
                              </Table.Cell>
                              <Table.Cell data-column-id="delete">
                                <Button
                                  size="2"
                                  variant="soft"
                                  color="red"
                                  type="button"
                                  onClick={() => void handleDeleteFile(item)}
                                  disabled={Boolean(
                                    deletingFileKey === `${item.storeType}:${item.fileName}`,
                                  )}
                                  aria-label={`Delete ${item.fileName}`}
                                >
                                  <DeleteIcon />
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
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
    </>
  )
}
