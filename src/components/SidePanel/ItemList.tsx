import { ItemCardType } from '@/types'
import { ReactNode } from 'react'
import { Callout } from '@/components/Callout/Callout'
import styles from './ItemList.module.scss'

interface ItemListProps<T> {
  items: T[]
  cardType: ItemCardType
  error?: boolean
  renderItem: (item: T, index: number) => ReactNode
}

const messages = {
  'query-item': {
    error: 'Unable to load data. Please refresh the page and try again.',
    empty: 'No results found. Modify your filters or search criteria and try again.',
  },
  'pinned-item': {
    error: 'Unable to load pinned items. Please refresh the page and try again.',
    empty: 'No items pinned.',
  },
}

const ItemList = <T,>({ items, cardType, error, renderItem }: ItemListProps<T>) => {
  return (
    <div className={styles.listContainer}>
      {error ? (
        <Callout type="error" message={messages[cardType].error} />
      ) : items.length === 0 ? (
        <Callout type="info" message={messages[cardType].empty} />
      ) : (
        <ul>{items.map(renderItem)}</ul>
      )}
    </div>
  )
}

export default ItemList
