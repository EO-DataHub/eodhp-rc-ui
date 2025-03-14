import { Item } from '@/types'
import { ReactNode } from 'react'
import { Callout } from '../Callout/Callout'
import styles from './ItemList.module.scss'

interface ItemListProps {
  items: Item[]
  error?: boolean
  renderItem: (item: Item, index: number) => ReactNode
}

const ItemListContent = ({ items, error, renderItem }: ItemListProps) => {
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

  return (
    <>
      <ul>{items.map((item, index) => renderItem(item, index))}</ul>
    </>
  )
}

const ItemList = ({ items, error, renderItem }: ItemListProps) => {
  return (
    <div className={styles.listContainer}>
      <ItemListContent items={items} error={error} renderItem={renderItem} />
    </div>
  )
}

export default ItemList
