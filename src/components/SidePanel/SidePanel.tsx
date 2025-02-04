import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flex, IconButton, Text } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import { ItemCard } from '@/components/ItemCard/ItemCard'
import { Item } from '@/types'
import FilterAltFilled from '../../../public/filter-alt-filled.svg?react'
import styles from './SidePanel.module.scss'
import { fetchCollections } from '@/services/collectionService'
import { Collection } from '@/types'

interface SidePanelProps {
  items: Item[]
  isLoading: boolean
  error: boolean
}

export const SidePanel: React.FC<SidePanelProps> = ({ items, isLoading, error }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  const { data: collectionsData } = useQuery({
    queryKey: ['Collections'],
    queryFn: fetchCollections,
    refetchOnWindowFocus: false,
    enabled: true,
  })

  const collections: Collection[] = collectionsData ?? []

  // this example is illustrative only (same as in itemService)
  // the target collection will be based on user selection input in the future
  const targetCollectionId = 'sentinel2_ard'
  const targetCollection = collections?.find((col) => col.id === targetCollectionId)
  const isLicenseProprietary = targetCollection?.license === 'proprietary'
  const isSARData = (): boolean => targetCollection?.stac_extensions?.[0].includes('/sar/') ?? false

  return (
    <Flex height="100vh">
      <Flex className={styles.sidePanel} direction="column" width="338px" p="4" gap="2">
        <Flex justify="end">
          <IconButton size="2" variant="ghost" onClick={toggleFilterPanel}>
            <Flex gap="2" align="center">
              <Text>Filters</Text>
              <FilterAltFilled />
            </Flex>
          </IconButton>
        </Flex>
        <SmallCollectionCard />
        <Flex justify="end">
          <Text weight="bold" size="2">
            25 of 125
          </Text>
        </Flex>
        {isLoading && <Text>Loading Items...</Text>}
        {error && <Text color="red">Error loading items!</Text>}
        <div className={styles.listContainer}>
          <ul>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isLicenseProprietary={isLicenseProprietary}
                isSARData={isSARData()}
              />
            ))}
          </ul>
        </div>
      </Flex>
      <FilterPanel isOpen={isFilterOpen} onClose={toggleFilterPanel} />
    </Flex>
  )
}
