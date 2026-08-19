import React, { useMemo } from 'react'
import { Flex, Table, Text } from '@radix-ui/themes'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from './PlatformCostsPage.module.scss'

// Illustrative only — BR-SYS-03: cloud costs not attributable to a single workspace (they
// carry a "platform" billing scope, not a workspace one), so they can't live on any
// per-workspace page.
interface PlatformCostRecord {
  id: string
  label: string
  credits: number
}

const MOCK_PLATFORM_COSTS: PlatformCostRecord[] = [
  { id: 'c1', label: 'Core services (API gateways, auth)', credits: 180 },
  { id: 'c2', label: 'Logging & monitoring', credits: 95 },
  { id: 'c3', label: 'Cataloguing & harvesting', credits: 260 },
]

export const PlatformCostsPage: React.FC = () => {
  const totalPlatformCosts = useMemo(
    () => MOCK_PLATFORM_COSTS.reduce((sum, row) => sum + row.credits, 0),
    [],
  )

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading
        title="Platform costs"
        subtitle="Cloud costs not attributable to any single workspace"
        hideWorkspace
      />

      <Flex direction="column" gap="2">
        <Table.Root className={styles.costsTable}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Cost</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {MOCK_PLATFORM_COSTS.map((cost) => (
              <Table.Row key={cost.id}>
                <Table.Cell>{cost.label}</Table.Cell>
                <Table.Cell>{cost.credits}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <Text size="2" color="gray">
          Total: {totalPlatformCosts} credits
        </Text>
      </Flex>
    </Flex>
  )
}
