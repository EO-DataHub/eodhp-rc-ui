import { useEffect } from 'react'
import type { Item } from '@/types'
import demoStore from './demoStore'
import { MAX_RUN_ITEMS } from './mockData'

/** Tells the demo which items the current search returned. */
export const useReportSearchResults = (items: Item[]) => {
  const ids = items.slice(0, MAX_RUN_ITEMS).map((i) => i.id)
  const idsKey = ids.join(',')
  useEffect(() => {
    demoStore.send({
      type: 'setResults',
      ids: idsKey ? idsKey.split(',') : [],
      total: items.length,
    })
  }, [idsKey, items.length])
}
