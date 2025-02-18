import React from 'react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import styles from './FilterPanel.module.scss'

import { QueryForm } from '@/components/QueryForm/QueryForm'
import rjsfCollections from '@/json-schema-forms/rjsfCollections.ts'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose }) => {
  const storedCollection = localStorage.getItem('selectedCollection')
  const selectedCollection = storedCollection ? JSON.parse(storedCollection) : null

  function storeQuery(query: object) {
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: query })
  }

  return (
    <Flex
      direction="column"
      justify="between"
      p="4"
      className={`${styles.filterPanel} ${isOpen ? styles['filterPanel--open'] : ''}`}
    >
      <Flex direction="column" gap="6">
        <Flex justify="between">
          <IconButton size="2" variant="ghost">
            <Flex gap="2" align="center">
              <ReloadIcon />
              <Text>Reload</Text>
            </Flex>
          </IconButton>
          <IconButton size="2" variant="ghost" onClick={onClose}>
            <Cross1Icon />
          </IconButton>
        </Flex>
        <QueryForm
          schema={rjsfCollections[selectedCollection?.id]}
          onSubmit={storeQuery}
          //Filters are currently focused on the globe, may change to selected areas in the future
          boundingBox={[-180.0, -90.0, 179.9, 90.0]}
        />
      </Flex>
    </Flex>
  )
}
