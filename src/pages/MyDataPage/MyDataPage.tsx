import React, { useMemo, useState, useContext } from 'react'
import { Flex, Text, TextField, Tabs, Box, Table, Select, Button, Checkbox } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAllOrders } from '@/services/orderService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { ChangeWokspaceModal } from '@/components/ChangeWokspaceModal/ChangeWokspaceModal'
import { Callout } from '@/components/Callout/Callout'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { formatOrderDate, OrderData } from '@/library/orderUtils'
import styles from './MyDataPage.module.scss'

export const MyDataPage: React.FC = () => {
  const { token, updateCurrentWorkspace } = useContext(AuthenticationContext)
  const navigate = useNavigate()
  const [isChangeWokspaceModalOpen, setIsChangeWokspaceModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState('all')
  const [selectedCollection, setSelectedCollection] = useState('all')
  const [includeFailedOrders, setIncludeFailedOrders] = useState(false) // Default to exclude failed orders

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
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

    // Determine the correct URL based on collection type
    let mapUrl: string
    if (collectionId === 'airbus_phr_data') {
      mapUrl = '/finder/my-airbus_phr_data'
    } else if (collectionId === 'airbus_pneo_data') {
      mapUrl = '/finder/airbus_pneo_data'
    } else {
      // Default pattern for other collections
      mapUrl = `/finder/my-${collectionId}`
    }

    // Navigate to the collection's map view
    void navigate(mapUrl)
  }

  const handleResetFilters = () => {
    setSelectedWorkspace('all')
    setSelectedCollection('all')
    setIncludeFailedOrders(false)
    setSearchText('')
  }

  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['AllOrders', token],
    queryFn: () => fetchAllOrders(token!),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  // Generate filter options from orders data
  const workspaceOptions = useMemo(() => {
    if (!orders) return []
    return ['all', ...new Set(orders.map((o) => o.workspace))]
  }, [orders])

  const collectionOptions = useMemo(() => {
    if (!orders) return []
    return ['all', ...new Set(orders.map((o) => o.collectionTitle))]
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (!orders) return []

    let filtered = orders

    // Apply workspace filter
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
  }, [orders, searchText, selectedWorkspace, selectedCollection, includeFailedOrders])

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
                      onValueChange={setSelectedWorkspace}
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
                    Showing {filteredOrders.length} of {orders?.length ?? 0} orders
                    {(selectedWorkspace !== 'all' ||
                      selectedCollection !== 'all' ||
                      includeFailedOrders) &&
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
                {filteredOrders && filteredOrders.length > 0 && (
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
                      {filteredOrders.map((order) => (
                        <Table.Row key={`${order.workspace}-${order.orderId}`}>
                          <Table.Cell>{order.workspace}</Table.Cell>
                          <Table.Cell>{order.collectionTitle}</Table.Cell>
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
