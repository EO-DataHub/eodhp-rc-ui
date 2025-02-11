import React, { useMemo } from 'react'
import { Heading, Flex, Table } from '@radix-ui/themes'
import type { Item } from '@/types'
import StacFields from '@radiantearth/stac-fields'
import styles from './MoreInfoPanel.module.scss'

interface MetadataSectionProps {
  item: Item | null
}

interface CubeData {
  [key: string]: { [key: string]: string | number | string[] | number[] }
}

interface MetadataProperties {
  label: string
  formatted: string
  value: string | number | CubeData
  spec: {
    label?: string
    explain?: string
  }
  itemOrder?: string[]
  items?: { [key: string]: { label: string; order: number } }
}

interface MetadataItem {
  extension: string
  properties: { [key: string]: MetadataProperties }
  label?: string
}

const renderCubeTable = ({ label, extension, properties }: MetadataItem) => {
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
  const dataTable = Object.keys(properties).map((key) => {
    const tableProperties = properties[key]

    const columnHeaders = tableProperties.itemOrder?.map((headerKey) => ({
      headerKey,
      label: tableProperties.items?.[headerKey]?.label ?? '',
    }))

    const rowKeys = Object.keys(tableProperties.value)
    const rowData = tableProperties.value

    const rows = rowKeys.map((key) => {
      const row = tableProperties.itemOrder?.map((headerKey) => {
        let content = StacFields.format(null)
        if (typeof rowData === 'object' && key in rowData && headerKey in rowData[key]) {
          content = StacFields.format(rowData[key][headerKey])
        }
        return { headerKey, content }
      })

      // append the row header cell
      return [{ headerKey: 'id', content: key }, ...(row ?? [])]
    })

    return {
      key: key,
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
          <Table.Root size="2" variant="ghost" layout="auto">
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
                <Table.Row key={row[0].headerKey}>
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

const renderTable = ({ label, extension, properties }: MetadataItem) => (
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

export const MetadataSection: React.FC<MetadataSectionProps> = ({ item }) => {
  const metadata: MetadataItem[] = useMemo(() => {
    if (!item) {
      return []
    }
    return StacFields.formatItemProperties(item) as MetadataItem[]
  }, [item])

  return (
    <Flex direction="column" gap="5">
      {metadata.map((metadataItem) =>
        metadataItem.extension === 'cube'
          ? renderCubeTable(metadataItem)
          : renderTable(metadataItem),
      )}
    </Flex>
  )
}
