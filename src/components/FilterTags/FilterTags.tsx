import React, { useMemo } from 'react'
import { filterMapping } from '@/constants/collectionCategorizations'
import { Button, Flex } from '@radix-ui/themes'
import { QuickFilter } from '@/types'
import { CrossCircledIcon } from '@radix-ui/react-icons'

interface FilterTagsProps {
  filters: QuickFilter
  onRemoveFilter: (key: keyof QuickFilter) => void
  variant?: 'full' | 'compact'
}

export const FilterTags: React.FC<FilterTagsProps> = ({
  filters,
  onRemoveFilter,
  variant = 'full',
}) => {
  const filterTags = useMemo(
    () =>
      Object.entries(filters)
        .map(([filterKey, filterValue]) => {
          const items = filterMapping[filterKey as keyof QuickFilter]
          const filterItem = items?.find((item) => item.value === filterValue)
          return filterItem ? { key: filterKey, ...filterItem } : null
        })
        .filter(Boolean),
    [filters],
  )

  return (
    filterTags.length > 0 && (
      <Flex
        wrap="wrap"
        p={variant === 'full' ? '5' : '0'}
        pt="0"
        gap="2"
        align="center"
        overflow="auto"
      >
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
