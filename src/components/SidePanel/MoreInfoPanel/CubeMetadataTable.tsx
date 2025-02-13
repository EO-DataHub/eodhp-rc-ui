import React from 'react'

import { Heading, Flex, Table } from '@radix-ui/themes'

import styles from './MoreInfoPanel.module.scss'
import StacFields from '@radiantearth/stac-fields'
import type { MetadataItem } from '@/types'

interface CubeMetadataTableProps {
  metadataItem: MetadataItem
}

export const CubeMetadataTable: React.FC<CubeMetadataTableProps> = ({ metadataItem }) => {
  const { label, extension, properties } = metadataItem
  /**
   * Example data used to parse the table data:
   *
   * itemOrder lists the columns and its order
   * properties in items contain information of the column, such as label
   * value contains rows and data (column) for each row
   *
   * cube:dimension:
   *   itemOrder: ['type', 'axis', 'extent', 'values', 'step', 'unit', 'reference_system']
   *   items: {type: {…}, axis: {…}, extent: {…}, reference_system: {…}, unit: {…}, …}
   *   value:
   *     lat: {type: 'spatial', axis: 'y', extent: Array(2), reference_system: 4326, unit: 'degrees_north'}
   *     lon: {type: 'spatial', axis: 'x', extent: Array(2), reference_system: 4326, unit: 'degrees_east'}
   *     time: {type: 'temporal', step: 'P1D', values: Array(1)}
   */
  const dataTable = Object.keys(properties).map((propertyKey) => {
    const tableProperties = properties[propertyKey]

    const columnHeaders = tableProperties.itemOrder?.map((headerKey) => ({
      headerKey,
      label: tableProperties.items?.[headerKey]?.label ?? '',
    }))

    const rowKeys = Object.keys(tableProperties.value)
    const rowData = tableProperties.value

    const rows = rowKeys.map((rowKey) => {
      const row = tableProperties.itemOrder?.map((headerKey) => {
        let content = StacFields.format(null)
        if (typeof rowData === 'object' && rowKey in rowData && headerKey in rowData[rowKey]) {
          content = StacFields.format(rowData[rowKey][headerKey])
        }
        return { headerKey, content }
      })

      // append the row header cell
      return [{ headerKey: 'id', content: rowKey }, ...(row ?? [])]
    })

    return {
      key: propertyKey,
      title: tableProperties.label ? tableProperties.label : 'General',
      // append the row header cell
      columnHeaders: [{ headerKey: 'id', label: 'ID' }, ...(columnHeaders ?? [])],
      rows,
    }
  })

  return (
    <Flex direction="column" gap="4" key={extension} className={styles.tableContainer}>
      <Heading as="h3" size="3" weight="bold">
        {label ? label : 'General'}
      </Heading>
      {dataTable.map(({ key, title, columnHeaders, rows }) => (
        <Flex key={key} direction="column" gap="1">
          <Heading as="h4" size="2" weight="medium">
            {title}
          </Heading>
          <Table.Root size="3" variant="ghost" layout="auto">
            <Table.Header>
              <Table.Row>
                {columnHeaders.map(({ headerKey, label }) => (
                  <Table.ColumnHeaderCell
                    key={headerKey}
                    dangerouslySetInnerHTML={{
                      __html: label,
                    }}
                  ></Table.ColumnHeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row[0].content}>
                  {row.map(({ headerKey, content }) =>
                    headerKey === 'id' ? (
                      <Table.RowHeaderCell key={headerKey}>{content}</Table.RowHeaderCell>
                    ) : (
                      <Table.Cell
                        key={headerKey}
                        dangerouslySetInnerHTML={{
                          __html: content,
                        }}
                      ></Table.Cell>
                    ),
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      ))}
    </Flex>
  )
}
