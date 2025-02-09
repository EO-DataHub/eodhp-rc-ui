import React from 'react'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Select, Text, TextField, RadioGroup, Button, IconButton } from '@radix-ui/themes'
import styles from './FilterPanel.module.scss'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose }) => {
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

        <Flex direction="column" gap="2">
          <Text weight="bold" size="2">
            Visualization
          </Text>
          <Select.Root size="2">
            <Select.Trigger style={{ width: '100%' }} placeholder="Select" />
            <Select.Content style={{ marginTop: '45px' }}>
              <Select.Group>
                <Select.Item value="option A">option A</Select.Item>
                <Select.Item value="option B">option B</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>

        <Flex direction="column" gap="2">
          <Text weight="bold" size="2">
            Date Range
          </Text>
          <TextField.Root placeholder="Start Date"></TextField.Root>
          <TextField.Root placeholder="End Date"></TextField.Root>
        </Flex>

        <Flex direction="column" gap="2">
          <Text weight="bold" size="2">
            Incident Angle
          </Text>
          <TextField.Root placeholder="Minimum"></TextField.Root>
          <TextField.Root placeholder="Maximum"></TextField.Root>
        </Flex>

        <Flex direction="column" gap="2">
          <Text weight="bold" size="2">
            Polarization Mode
          </Text>
          <Select.Root size="2">
            <Select.Trigger style={{ width: '100%' }} placeholder="Select" />
            <Select.Content style={{ marginTop: '45px' }}>
              <Select.Group>
                <Select.Item value="option A">option A</Select.Item>
                <Select.Item value="option B">option B</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>

        <Flex direction="column" gap="2">
          <Text weight="bold" size="2">
            Filter Heading
          </Text>
          <RadioGroup.Root defaultValue="1" name="filterHeading">
            <RadioGroup.Item value="1">Text</RadioGroup.Item>
            <RadioGroup.Item value="2">Text</RadioGroup.Item>
            <RadioGroup.Item value="3">Text</RadioGroup.Item>
          </RadioGroup.Root>
        </Flex>
      </Flex>

      <Button variant="solid">Apply</Button>
    </Flex>
  )
}
