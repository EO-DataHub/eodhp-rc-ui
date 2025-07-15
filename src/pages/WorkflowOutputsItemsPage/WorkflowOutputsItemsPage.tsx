import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Flex, Box, Text, Button, ScrollArea } from '@radix-ui/themes'
import { Item } from '@/types'
import { ItemMap } from '@/pages/OrderDetailsPage/ItemMap/ItemMap'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import styles from './WorkflowOutputsItemsPage.module.scss'

export const WorkflowOutputsItemsPage: React.FC = () => {
  const { encodedItemsEndpoint } = useParams<{ encodedItemsEndpoint: string }>()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Decode the endpoint
  let itemsEndpoint = ''
  try {
    itemsEndpoint = decodeURIComponent(encodedItemsEndpoint ?? '')
  } catch {
    itemsEndpoint = ''
  }

  // Replace logical OR with nullish coalescing
  const BASE_API_URL = import.meta.env.VITE_HUB_BASE_URL ?? 'https://eodatahub.org.uk'

  useEffect(() => {
    if (!itemsEndpoint) return
    setLoading(true)
    setError(null)
    fetch(`${BASE_API_URL}${itemsEndpoint}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch items')
        return res.json()
      })
      .then((data) => {
        setItems(data.features ?? [])
        setSelectedItem(data.features?.[0] ?? null)
      })
      .catch(() => setError('Failed to fetch items'))
      .finally(() => setLoading(false))
  }, [itemsEndpoint, BASE_API_URL])

  return (
    <Flex direction="column" height="100vh" className={styles.mainContainer}>
      <Button variant="soft" size="2" mb="2" onClick={() => navigate(-1)}>
        Back
      </Button>
      <Flex gap="4" style={{ flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <ScrollArea type="always" style={{ width: 340, height: '100%' }}>
          <Flex direction="column" gap="2" style={{ padding: 8 }}>
            {loading ? (
              <Text>Loading...</Text>
            ) : error ? (
              <Text color="red">{error}</Text>
            ) : items.length === 0 ? (
              <Text>No items found.</Text>
            ) : (
              items.map((item) => {
                const thumbnailUrl = item.assets?.thumbnail?.href ?? DefaultThumbnail
                return (
                  <Flex
                    key={item.id}
                    className={styles.card}
                    direction="row"
                    align="center"
                    gap="2"
                    style={{
                      cursor: 'pointer',
                      border:
                        selectedItem?.id === item.id ? '2px solid #3a5bc7' : '1px solid #e0e0e0',
                      borderRadius: 8,
                      padding: 8,
                      background: selectedItem?.id === item.id ? '#f0f4ff' : '#fff',
                    }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <img
                      src={thumbnailUrl}
                      alt={item.id}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).onerror = null
                        ;(e.currentTarget as HTMLImageElement).src = DefaultThumbnail
                      }}
                    />
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text
                        weight="bold"
                        size="2"
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.properties?.title ?? item.id}
                      </Text>
                      <Text
                        size="1"
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.id}
                      </Text>
                    </Flex>
                  </Flex>
                )
              })
            )}
          </Flex>
        </ScrollArea>
        {/* Map and Details */}
        <Box flexGrow="1" style={{ minWidth: 0, position: 'relative' }}>
          {selectedItem ? (
            <Flex gap="4" align="start" style={{ height: '100%' }}>
              <Box style={{ minWidth: 400, flex: 1 }}>
                <ItemMap item={selectedItem} providerType="airbus_optical" />
              </Box>
              <Flex direction="column" gap="1" style={{ minWidth: 300, maxWidth: 400 }}>
                <Text weight="bold" size="4" style={{ marginBottom: '0.5em' }}>
                  {selectedItem.properties?.title ?? selectedItem.id}
                </Text>
                <Text size="2">{selectedItem.id}</Text>
                {selectedItem.properties?.description && (
                  <Text size="2">{selectedItem.properties.description}</Text>
                )}
                {/* Add more metadata fields here if desired */}
              </Flex>
            </Flex>
          ) : (
            <Text>Select an item to view details.</Text>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}

export default WorkflowOutputsItemsPage
