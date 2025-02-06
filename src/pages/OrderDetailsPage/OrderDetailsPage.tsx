import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchItems } from '@/services/ItemService'
import { Item } from '@/types'
import { Flex, Text, Kbd, Button, Checkbox, Link, Select, TextField } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { InfoCircledIcon } from '@radix-ui/react-icons'

const termsAndConditionsInfo = [
  { text: 'I have read and understand the product license.', link: '#' },
  { text: ' have read and understand the vendor terms and conditions.', link: '#' },
  { text: 'I give consent for the EODH to place the order on my behalf.', link: '#' },
]

const TermsAndConditionsContainer: React.FC = () => {
  return (
    <Flex className={styles.conditionsContainer} direction="column" gap="3">
      {termsAndConditionsInfo.map((info, index) => (
        <Flex key={index} gap="3" className={styles.checkGroup}>
          <Checkbox className={styles.checkbox}></Checkbox>
          <Text>{info.text}</Text>
          <Link className={styles.linkText} href={info.link}>
            Learn more
          </Link>
        </Flex>
      ))}
    </Flex>
  )
}

const OpticalSelections: React.FC = () => {
  return (
    <Flex direction="column" gap="4" className={styles.selectionsContainer}>
      <Flex direction="column">
        <Flex className={styles.selection} direction="row" gap="3">
          <Text>Product ID</Text>
          <InfoCircledIcon />
        </Flex>

        <Flex>
          <TextField.Root style={{ width: '100%' }} placeholder="Enter ID"></TextField.Root>
        </Flex>
      </Flex>

      <Flex direction="column" gap="1">
        <Flex className={styles.selection} direction="row" gap="3">
          <Text>Product Bundle</Text>
          <InfoCircledIcon />
        </Flex>

        <Flex>
          <Select.Root size="3">
            <Select.Trigger style={{ width: '100%' }} placeholder="Select" />
            <Select.Content style={{ marginTop: '45px', width: '100%' }}>
              <Select.Group>
                <Select.Item value="sample item">Sample Item</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>

      <Flex direction="column" gap="1">
        <Flex className={styles.selection} direction="row" gap="3">
          <Text>End User Country</Text>
          <InfoCircledIcon />
        </Flex>

        <Flex>
          <Select.Root size="3">
            <Select.Trigger style={{ width: '100%' }} placeholder="Select" />
            <Select.Content style={{ marginTop: '45px', width: '100%' }}>
              <Select.Group>
                <Select.Item value="sample item">Sample Item</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>

      <Flex direction="column" gap="1">
        <Flex className={styles.selection} direction="row" gap="3">
          <Text>License</Text>
          <InfoCircledIcon />
        </Flex>

        <Flex>
          <Select.Root size="3">
            <Select.Trigger style={{ width: '100%' }} placeholder="Select" />
            <Select.Content style={{ marginTop: '45px', width: '100%' }}>
              <Select.Group>
                <Select.Item value="sample item">Sample Item</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>
    </Flex>
  )
}

const ItemInfo: React.FC = () => {
  return <Flex className={styles.itemInfoContainer}>ITEM INFO</Flex>
}

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

  console.log({ item })

  if (isLoading) return <Flex>Loading...</Flex>
  if (error) return <Flex>Error loading items.</Flex>
  if (!item) return <Flex>No order item found.</Flex>

  return (
    <Flex direction="column" height="100vh" className={styles.mainContainer}>
      <Flex direction="column" gap="2">
        <Kbd className={styles.tag}>Provider Name</Kbd>
        <Text size="3" weight="bold">
          {item.collection}: {item.id}
        </Text>
        <Text size="2">Contract ID: text</Text>
        <Text size="2">Asset ID: text</Text>
      </Flex>
      <Flex direction="row" gap="4" className={styles.bodyContainer}>
        <ItemInfo />
        <OpticalSelections />
      </Flex>
      <TermsAndConditionsContainer />
      <Flex className={styles.buttonsContainer} direction="row" gap="3">
        <Button className={styles.cancelButton}>Cancel</Button>
        <Button className={styles.purchaseButton}>Place Order</Button>
      </Flex>
    </Flex>
  )
}
