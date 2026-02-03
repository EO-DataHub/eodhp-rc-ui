import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ProcessRecord } from '@/types'
import { fetchItems } from '@/services/processCatalogueService'

const DEFAULT_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 400

export type TypeFilter = 'all' | 'workflow' | 'notebook'

export interface UseProcessCatalogueResult {
  items: ProcessRecord[]
  totalItems: number
  page: number
  totalPages: number
  pageSize: number
  searchQuery: string
  searchInput: string
  typeFilter: TypeFilter
  collectionFilter: string | null
  isLoading: boolean
  error: string | null
  setSearchQuery: (q: string) => void
  setTypeFilter: (t: TypeFilter) => void
  setCollectionFilter: (c: string | null) => void
  setPage: (p: number) => void
  clearAllFilters: () => void
  retry: () => void
}

function updateSearchParams(
  setSearchParams: (params: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => void,
  updates: { page?: number; q?: string; type?: string; collection?: string | null },
): void {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    if (updates.page !== undefined) next.set('page', String(updates.page))
    if (updates.q !== undefined) updates.q ? next.set('q', updates.q) : next.delete('q')
    if (updates.type !== undefined)
      updates.type && updates.type !== 'all' ? next.set('type', updates.type) : next.delete('type')
    if (updates.collection !== undefined)
      updates.collection ? next.set('collection', updates.collection) : next.delete('collection')
    return next
  })
}

export function useProcessCatalogue(): UseProcessCatalogueResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialRead = useRef(false)

  const [items, setItems] = useState<ProcessRecord[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPageState] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchQuery, setSearchQueryState] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilterState] = useState<TypeFilter>('all')
  const [collectionFilter, setCollectionFilterState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read initial values from URL on mount
  useEffect(() => {
    if (initialRead.current) return
    initialRead.current = true
    const p = searchParams.get('page')
    const q = searchParams.get('q') ?? ''
    const t = (searchParams.get('type') ?? 'all') as TypeFilter
    const c = searchParams.get('collection') ?? null

    if (p) {
      const pNum = parseInt(p, 10)
      if (!Number.isNaN(pNum) && pNum >= 1) setPageState(pNum)
    }
    setSearchQueryState(q)
    setSearchInput(q)
    if (t === 'workflow' || t === 'notebook') setTypeFilterState(t)
    setCollectionFilterState(c && c.trim() !== '' ? c : null)
  }, [searchParams])

  // Debounced search: searchInput -> searchQuery after delay
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQueryState(searchInput)
      setPageState(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const setPage = useCallback(
    (p: number) => {
      const next = Math.max(1, p)
      setPageState(next)
      updateSearchParams(setSearchParams, { page: next })
    },
    [setSearchParams],
  )

  const setSearchQuery = useCallback((q: string) => {
    setSearchInput(q)
  }, [])

  const setTypeFilter = useCallback(
    (t: TypeFilter) => {
      setTypeFilterState(t)
      setPageState(1)
      updateSearchParams(setSearchParams, {
        type: t !== 'all' ? t : undefined,
        page: 1,
      })
    },
    [setSearchParams],
  )

  const setCollectionFilter = useCallback(
    (c: string | null) => {
      setCollectionFilterState(c)
      setPageState(1)
      updateSearchParams(setSearchParams, {
        collection: c,
        page: 1,
      })
    },
    [setSearchParams],
  )

  // Sync searchQuery to URL when debounced value changes
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        searchQuery ? next.set('q', searchQuery) : next.delete('q')
        return next
      },
      { replace: true },
    )
  }, [searchQuery, setSearchParams])

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const typeParam: 'workflow' | 'notebook' | undefined =
      typeFilter === 'all' ? undefined : typeFilter

    const { data, error: err } = await fetchItems({
      page,
      pageSize,
      q: searchQuery || undefined,
      type: typeParam,
      applicableCollections: collectionFilter ?? undefined,
    })

    setIsLoading(false)

    if (err) {
      setError(err)
      setItems([])
      setTotalItems(0)
      setTotalPages(0)
      return
    }

    if (data) {
      setItems(data.items)
      setTotalItems(data.total_items)
      setTotalPages(Math.max(1, data.total_pages))
    }
  }, [page, pageSize, searchQuery, typeFilter, collectionFilter])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const clearAllFilters = useCallback(() => {
    setSearchInput('')
    setSearchQueryState('')
    setTypeFilterState('all')
    setCollectionFilterState(null)
    setPageState(1)
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  // Ensure page is within totalPages when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPageState(totalPages)
    }
  }, [totalPages, page])

  const retry = useCallback(() => {
    void loadItems()
  }, [loadItems])

  return {
    items,
    totalItems,
    page,
    totalPages,
    pageSize,
    searchQuery,
    searchInput,
    typeFilter,
    collectionFilter,
    isLoading,
    error,
    setSearchQuery,
    setTypeFilter,
    setCollectionFilter,
    setPage,
    clearAllFilters,
    retry,
  }
}
