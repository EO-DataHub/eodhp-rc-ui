import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import { Flex, Box, Text } from '@radix-ui/themes'

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()

  const {
    data: items,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['Items'],
    queryFn: fetchItems,
    refetchOnWindowFocus: false,
  })

  const item = items?.find((itm: Item) => itm.id === orderId)

  if (isLoading) return <Flex>Loading...</Flex>
  if (error) return <Flex>Error loading items.</Flex>
  if (!item) return <Flex>No order item found.</Flex>

  return (
    <Flex direction="column" height="100vh">
      <Box flexGrow="1" p="4">
        <Text size="3" weight="bold">
          Order Details Page
        </Text>
        <Text size="2">Order ID: {orderId}</Text>
      </Box>
    </Flex>
  )
}
