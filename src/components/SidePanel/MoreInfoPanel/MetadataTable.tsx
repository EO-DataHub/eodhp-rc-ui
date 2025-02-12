import React from 'react'

import { Heading, Flex, Table } from '@radix-ui/themes'

import styles from './MoreInfoPanel.module.scss'
import type { MetadataItem } from '@/types'

interface MetadataTableProps {
  metadataItem: MetadataItem
}

export const MetadataTable: React.FC<MetadataTableProps> = ({ metadataItem }) => {
  const { label, extension, properties } = metadataItem

  return (
    <Flex direction="column" gap="1" key={extension} className={styles.tableContainer}>
      <Heading as="h3" size="3" weight="bold">
        {label ? label : 'General'}
      </Heading>
      <Table.Root size="2" variant="ghost" layout="auto">
        <Table.Body>
          {Object.keys(properties).map((key) => (
            <Table.Row key={key}>
              <Table.RowHeaderCell width="160px">
                {properties[key].spec.label ?? properties[key].label}
              </Table.RowHeaderCell>
              <Table.Cell
                dangerouslySetInnerHTML={{
                  __html: properties[key].formatted,
                }}
              ></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  )
}
