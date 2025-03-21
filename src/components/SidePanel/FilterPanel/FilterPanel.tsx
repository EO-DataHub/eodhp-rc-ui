import React, { useRef } from 'react'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import styles from './FilterPanel.module.scss'

import { QueryForm, QueryFormRef } from '@/components/QueryForm/QueryForm'
import rjsfCollections from '@/json-schema-forms/rjsfCollections.ts'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose }) => {
  const selectedCollection = useSelector(dataFinderStore, (state) => state.context.collection)
  const queryFormRef = useRef<QueryFormRef>(null)

  function storeQuery(query: object) {
    dataFinderStore.send({ type: 'queryFilterChange', queryFilter: query })
  }

  function handleResetForm() {
    if (queryFormRef.current) {
      queryFormRef.current.resetForm()
    }
  }

  return (
    <Flex
      direction="column"
      p="4"
      className={`${styles.filterPanel} ${isOpen ? styles['filterPanel--open'] : ''}`}
    >
      <Flex direction="column" gap="6" height="100%">
        <Flex justify="between">
          <IconButton size="2" variant="ghost" onClick={handleResetForm}>
            <Flex gap="2" align="center">
              <ReloadIcon />
              <Text>Reset</Text>
            </Flex>
          </IconButton>
          <IconButton size="2" variant="ghost" onClick={onClose}>
            <Cross1Icon />
          </IconButton>
        </Flex>
        <QueryForm
          ref={queryFormRef}
          schema={
            selectedCollection?.id
              ? rjsfCollections[selectedCollection.id] || rjsfCollections.default
              : rjsfCollections.default
          }
          onSubmit={storeQuery}
          //Filters are currently focused on the globe, may change to selected areas in the future
          boundingBox={[-180.0, -90.0, 179.9, 90.0]}
        />
      </Flex>
    </Flex>
  )
}
