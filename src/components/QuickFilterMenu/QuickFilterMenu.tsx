import React from 'react'
import { Flex, Select, Box } from '@radix-ui/themes'
import styles from './QuickFilterMenu.module.scss'
import {
  dataCategories,
  keywords,
  licenses,
  locations,
  providers,
  resolutions,
  timePeriods,
} from './filterConstants'
import type { QuickFilter } from '@/types'

interface QuickFilterMenuProps {
  filters: QuickFilter
  setFilters: React.Dispatch<React.SetStateAction<QuickFilter>>
}

export const QuickFilterMenu: React.FC<QuickFilterMenuProps> = ({ filters, setFilters }) => {
  const handleValueChange = (value: string, key: keyof QuickFilter) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Flex
      p="5"
      gap="2"
      align="center"
      justify="between"
      className={styles.container}
      overflow="auto"
    >
      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.dataCategory}
          onValueChange={(value) => handleValueChange(value, 'dataCategory')}
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

      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.resolution}
          onValueChange={(value) => handleValueChange(value, 'resolution')}
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

      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.provider}
          onValueChange={(value) => handleValueChange(value, 'provider')}
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

      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.location}
          onValueChange={(value) => handleValueChange(value, 'location')}
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

      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.keyword}
          onValueChange={(value) => handleValueChange(value, 'keyword')}
        >
          <Select.Trigger style={{ width: '100%' }} placeholder="Keywords" />
          <Select.Content position="popper">
            <Select.Group>
              {keywords.map((item) => (
                <Select.Item value={item.value} key={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.timePeriod}
          onValueChange={(value) => handleValueChange(value, 'timePeriod')}
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

      <Box flexGrow="1" width="160px" flexShrink="0">
        <Select.Root
          size="3"
          value={filters.license}
          onValueChange={(value) => handleValueChange(value, 'license')}
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
