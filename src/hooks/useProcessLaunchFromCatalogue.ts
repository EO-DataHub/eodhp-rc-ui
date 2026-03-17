import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Collection, Item, ProcessDetail } from '@/types'
import { fetchItems as fetchCollectionItems, fetchCollectionByUrl } from '@/services/itemService'
import { useCollections } from '@/hooks/useCollections'
import { getSelfLinkHref } from '@/library/integrationTools'

interface UseProcessLaunchFromCatalogueParams {
  process: ProcessDetail
}

interface UseProcessLaunchFromCatalogueResult {
  collections: { id: string; label: string; url: string }[]
  selectedCollectionUrl: string | null
  selectedCollection: Collection | null
  setSelectedCollectionUrl: (url: string | null) => void
  startDate: string | null
  endDate: string | null
  setStartDate: (value: string | null) => void
  setEndDate: (value: string | null) => void
  items: Item[]
  selectedItem: Item | null
  setSelectedItemId: (id: string | null) => void
  isLoadingItems: boolean
  itemsError: string | null
  dateRangeError: string | null
  reset: () => void
}

export function useProcessLaunchFromCatalogue(
  params: UseProcessLaunchFromCatalogueParams,
): UseProcessLaunchFromCatalogueResult {
  const { sortedCollections } = useCollections()

  const collections = useMemo(
    () =>
      (params.process.properties?.applicableCollections ?? [])
        .map((value) => {
          const matchedCollection = sortedCollections.find((c) => c.id === value)

          if (!matchedCollection) {
            return null
          }

          const url = getSelfLinkHref(matchedCollection)
          if (!url) {
            return null
          }

          const labelBase =
            matchedCollection.displayedTitle ?? matchedCollection.title ?? matchedCollection.id

          return {
            id: matchedCollection.id,
            label: labelBase,
            url,
          }
        })
        .filter((c): c is { id: string; label: string; url: string } => c !== null),
    [params.process.properties?.applicableCollections, sortedCollections],
  )

  const [selectedCollectionUrl, setSelectedCollectionUrlState] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [dateRangeError, setDateRangeError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  const loadItemsForCollection = useCallback(
    async (collectionUrl: string | null) => {
      if (!collectionUrl) {
        setSelectedCollection(null)
        setItems([])
        setSelectedItem(null)
        setItemsError(null)
        setDateRangeError(null)
        return
      }

      // Validate date range before querying
      if (startDate && endDate && startDate > endDate) {
        setSelectedCollection(null)
        setItems([])
        setSelectedItem(null)
        setItemsError(null)
        setDateRangeError('Start date must be before or equal to end date.')
        setIsLoadingItems(false)
        return
      }

      setIsLoadingItems(true)
      setItemsError(null)
      setDateRangeError(null)
      setItems([])
      setSelectedItem(null)

      try {
        const collection = await fetchCollectionByUrl(collectionUrl)
        setSelectedCollection(collection)

        let queryFilter: Record<string, string> | undefined
        if (startDate ?? endDate) {
          const startPart = startDate ? `${startDate}T00:00:00Z` : '..'
          const endPart = endDate ? `${endDate}T23:59:59Z` : '..'
          queryFilter = {
            datetime: `${startPart}/${endPart}`,
          }
        }

        const fetchedItems = await fetchCollectionItems({
          limit: 200,
          selectedCollection: collection,
          queryFilter,
        })

        setItems(fetchedItems)
        setSelectedItem(fetchedItems[0] ?? null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load datasets for collection.'
        setItemsError(message)
        setSelectedCollection(null)
        setItems([])
        setSelectedItem(null)
      } finally {
        setIsLoadingItems(false)
      }
    },
    [endDate, startDate],
  )

  const setSelectedCollectionUrl = useCallback((url: string | null) => {
    setSelectedCollectionUrlState(url)
  }, [])

  const setSelectedItemId = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelectedItem(null)
        return
      }
      const item = items.find((i) => i.id === id) ?? null
      setSelectedItem(item)
    },
    [items],
  )

  const reset = useCallback(() => {
    setSelectedCollectionUrlState(null)
    setSelectedCollection(null)
    setItems([])
    setSelectedItem(null)
    setItemsError(null)
    setDateRangeError(null)
    setStartDate(null)
    setEndDate(null)
    setIsLoadingItems(false)
  }, [])

  useEffect(() => {
    if (selectedCollectionUrl) {
      void loadItemsForCollection(selectedCollectionUrl)
    }
  }, [loadItemsForCollection, selectedCollectionUrl])

  return {
    collections,
    selectedCollectionUrl,
    selectedCollection,
    setSelectedCollectionUrl,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    items,
    selectedItem,
    setSelectedItemId,
    isLoadingItems,
    itemsError,
    dateRangeError,
    reset,
  }
}
