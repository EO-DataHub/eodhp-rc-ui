import React, { useMemo } from 'react'
import {
  dataCategories,
  keywords,
  licenses,
  locations,
  providers,
  resolutions,
  timePeriods,
} from '@/collectionCategorizations'
import { Button, Flex } from '@radix-ui/themes'
import { QuickFilter } from '@/types'
import { CrossCircledIcon } from '@radix-ui/react-icons'

interface FilterTagsProps {
  filters: QuickFilter
  onRemoveFilter: (key: keyof QuickFilter) => void
}

export const FilterTags: React.FC<FilterTagsProps> = ({ filters, onRemoveFilter }) => {
  const filterTags = useMemo(() => {
    return Object.entries(filters).map(([filterKey, filterValue]) => {
      const predicate = (item: { label: string; value: string }) => item.value === filterValue

      let filterItem
      if (filterKey === 'dataCategory') {
        filterItem = dataCategories.find(predicate)
      } else if (filterKey === 'resolution') {
        filterItem = resolutions.find(predicate)
      } else if (filterKey === 'provider') {
        filterItem = providers.find(predicate)
      } else if (filterKey === 'location') {
        filterItem = locations.find(predicate)
      } else if (filterKey === 'timePeriod') {
        filterItem = timePeriods.find(predicate)
      } else if (filterKey === 'license') {
        filterItem = licenses.find(predicate)
      } else {
        filterItem = keywords.find(predicate)
      }
      return { key: filterKey, ...filterItem }
    })
  }, [filters])

  return (
    filterTags.length > 0 && (
      <Flex p="5" pt="0" gap="2" align="center" overflow="auto">
        {filterTags.map(
          (tag, index) =>
            tag &&
            'label' in tag && (
              <Button
                radius="full"
                variant="soft"
                color="gray"
                size="1"
                key={index}
                onClick={() => onRemoveFilter(tag.key as keyof QuickFilter)}
              >
                <CrossCircledIcon />
                {tag.label}
              </Button>
            ),
        )}
      </Flex>
    )
  )
}
