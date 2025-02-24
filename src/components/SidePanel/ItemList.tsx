import { Item } from '@/types'
import { Flex } from '@radix-ui/themes'
import { ReactNode } from 'react'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import { Callout } from '../Callout/Callout'
import styles from './ItemList.module.scss'

interface ItemListProps {
  items: Item[]
  isLoading: boolean
  error: boolean
  renderItem: (item: Item, index: number) => ReactNode
}

const ItemListContent = ({ items, isLoading, error, renderItem }: ItemListProps) => {
  if (isLoading) {
    return (
      <Flex justify="center">
        <LoadingIndicator />
      </Flex>
    )
  }

  if (error) {
    return (
      <Callout type="error" message="Unable to load data. Please refresh the page and try again." />
    )
  }

  if (items.length === 0) {
    return (
      <Callout
        type="info"
        message="No results found. Modify your filters or search criteria and try again"
      />
    )
  }

  return <ul>{items.map((item, index) => renderItem(item, index))}</ul>
}

const ItemList = ({ items, isLoading, error, renderItem }: ItemListProps) => {
  return (
    <div className={styles.listContainer}>
      <ItemListContent items={items} isLoading={isLoading} error={error} renderItem={renderItem} />
    </div>
  )
}

export default ItemList
