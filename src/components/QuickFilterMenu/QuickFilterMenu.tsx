import React from 'react'
import { Flex, Select, Box } from '@radix-ui/themes'
import styles from './QuickFilterMenu.module.scss'
import {
  dataCategories,
  licenses,
  locations,
  providers,
  resolutions,
  timePeriods,
} from '@/constants/collectionCategorizations'
import type { QuickFilter } from '@/types'

interface QuickFilterMenuProps {
  filters: QuickFilter
  onFilterChange: (value: string, forKey: keyof QuickFilter) => void
  flexDirection?: 'column' | 'row'
  inputSize?: '1' | '2' | '3'
}

export const QuickFilterMenu: React.FC<QuickFilterMenuProps> = ({
  filters,
  onFilterChange,
  flexDirection = 'row',
  inputSize = '3',
}) => {
  const width = flexDirection === 'row' ? '160px' : '100%'

  return (
    <Flex
      p={flexDirection === 'row' ? '5' : '0'}
      direction={flexDirection}
      gap="2"
      align="center"
      justify="between"
      className={styles.container}
      overflow="auto"
    >
      <Box flexGrow="1" width={width} flexShrink="0">
        <Select.Root
          size={inputSize}
          key={filters.dataCategory}
          value={filters.dataCategory}
          onValueChange={(value) => onFilterChange(value, 'dataCategory')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="Data Category" />
          <Select.Content position="popper">
            <Select.Group>
              {dataCategories.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1" width={width} flexShrink="0">
        <Select.Root
          size={inputSize}
          key={filters.resolution}
          value={filters.resolution}
          onValueChange={(value) => onFilterChange(value, 'resolution')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="Resolution" />
          <Select.Content position="popper">
            <Select.Group>
              {resolutions.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1" width={width} flexShrink="0">
        <Select.Root
          size={inputSize}
          key={filters.provider}
          value={filters.provider}
          onValueChange={(value) => onFilterChange(value, 'provider')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="Provider" />
          <Select.Content position="popper">
            <Select.Group>
              {providers.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1" width={width} flexShrink="0">
        <Select.Root
          size={inputSize}
          key={filters.location}
          value={filters.location}
          onValueChange={(value) => onFilterChange(value, 'location')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="Location" />
          <Select.Content position="popper">
            <Select.Group>
              {locations.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1" width={width} flexShrink="0">
        <Select.Root
          size={inputSize}
          key={filters.timePeriod}
          value={filters.timePeriod}
          onValueChange={(value) => onFilterChange(value, 'timePeriod')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="Time Period" />
          <Select.Content position="popper">
            <Select.Group>
              {timePeriods.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1" width={width} flexShrink="0">
        <Select.Root
          size={inputSize}
          key={filters.license}
          value={filters.license}
          onValueChange={(value) => onFilterChange(value, 'license')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="License" />
          <Select.Content position="popper">
            <Select.Group>
              {licenses.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>
    </Flex>
  )
}
