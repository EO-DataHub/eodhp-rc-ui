import { ReactNode } from 'react'
import { Callout } from '../Callout/Callout'
import styles from './ItemList.module.scss'

interface ItemListProps<T> {
  items: T[]
  error: boolean
  renderItem: (item: T, index: number) => ReactNode
}

const ItemListContent = <T,>({ items, error, renderItem }: ItemListProps<T>) => {
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

const ItemList = <T,>({ items, error, renderItem }: ItemListProps<T>) => {
  return (
    <div className={styles.listContainer}>
      <ItemListContent items={items} error={error} renderItem={renderItem} />
    </div>
  )
}

export default ItemList
