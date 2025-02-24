import React, { useMemo } from 'react'
import {
  dataCategories,
  keywords,
  licenses,
  locations,
  providers,
  resolutions,
  timePeriods,
} from '@/constants/collectionCategorizations'
import { Button, Flex } from '@radix-ui/themes'
import { QuickFilter } from '@/types'
import { CrossCircledIcon } from '@radix-ui/react-icons'

interface FilterTagsProps {
  filters: QuickFilter
  onRemoveFilter: (key: keyof QuickFilter) => void
}

const filterMapping: Record<string, { label: string; value: string }[]> = {
  dataCategory: dataCategories,
  resolution: resolutions,
  provider: providers,
  location: locations,
  timePeriod: timePeriods,
  license: licenses,
}

export const FilterTags: React.FC<FilterTagsProps> = ({ filters, onRemoveFilter }) => {
  const filterTags = useMemo(
    () =>
      Object.entries(filters)
        .map(([filterKey, filterValue]) => {
          const items = filterMapping[filterKey] || keywords
          const filterItem = items.find((item) => item.value === filterValue)
          return filterItem ? { key: filterKey, ...filterItem } : null
        })
        .filter(Boolean),
    [filters],
  )

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
