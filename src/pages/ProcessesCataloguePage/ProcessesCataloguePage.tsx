import React, { useEffect } from 'react'
import { useProcessCatalogue } from '@/hooks/useProcessCatalogue'
import { ProcessCatalogueView } from '@/components/ProcessCatalogue/ProcessCatalogueView'
import { ProcessFilters } from '@/components/ProcessCatalogue/ProcessFilters'

export const ProcessesCataloguePage: React.FC = () => {
  const {
    items,
    totalItems,
    page,
    totalPages,
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
    searchQuery,
  } = useProcessCatalogue()

  useEffect(() => {
    document.title = 'Processes Catalogue'
    return () => {
      document.title = 'EODH Resource Catalog'
    }
  }, [])

  const hasActiveFilters = Boolean(searchQuery) || typeFilter !== 'all' || Boolean(collectionFilter)

  return (
    <ProcessCatalogueView
      title="Processes Catalogue"
      filters={
        <ProcessFilters
          searchValue={searchInput}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          collectionFilter={collectionFilter}
          onCollectionFilterChange={setCollectionFilter}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAllFilters}
        />
      }
      items={items}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={setPage}
    />
  )
}
