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

    const data = {
      type: 'Feature',
      stac_version: '1.0.0',
      stac_extensions: [
        'https://stac-extensions.github.io/datacube/v2.2.0/schema.json',
        'https://stac-extensions.github.io/scientific/v1.0.0/schema.json',
      ],
      id: 'a51f96b7-61dd-40e2-a4f2-ede8d0053d45',
      collection: 'eocis-lst-day',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-179.9949951171875, -89.99500274658203],
            [179.9949951171875, -89.99500274658203],
            [179.9949951171875, 89.99498748779297],
            [-179.9949951171875, 89.99498748779297],
            [-179.9949951171875, -89.99500274658203],
          ],
        ],
      },
      bbox: [-179.9949951171875, -89.99500274658203, 179.9949951171875, 89.99498748779297],
      properties: {
        title:
          'EOCIS land surface temperature daytime data at product level L3C from Sea and Land Surface Temperature Radiometer A and B.',
        description:
          'This file contains level L3C global land surface temperatures from SLSTR. L3C data are derived from multiple orbits of single sensor L3U data combined onto a space and/or time grid.',
        datetime: '2022-12-31T00:00:00Z',
        license: 'cc-by-4.0',
        platform: 'Sentinel3B',
        instruments: ['SLSTR'],
        'cube:dimensions': {
          lon: {
            type: 'spatial',
            axis: 'x',
            extent: [-180, 180],
            reference_system: 4326,
            unit: 'degrees_east',
          },
          lat: {
            type: 'spatial',
            axis: 'y',
            extent: [-90, 90],
            reference_system: 4326,
            unit: 'degrees_north',
          },
          time: { type: 'temporal', step: 'P1D', values: ['2022-12-31T00:00:00Z'] },
        },
        'cube:variables': {
          lst: {
            description: 'land surface temperature',
            dimensions: ['time', 'lat', 'lon'],
            type: 'data',
            unit: 'kelvin',
          },
          lst_uncertainty: {
            description: 'land surface temperature total uncertainty',
            dimensions: ['time', 'lat', 'lon'],
            type: 'data',
            unit: 'kelvin',
          },
          ndvi: {
            description: 'normalized difference vegetation index',
            dimensions: ['time', 'lat', 'lon'],
            type: 'data',
            unit: '1',
          },
          emis: {
            description: 'surface emissivity',
            dimensions: ['time', 'lat', 'lon'],
            type: 'data',
            unit: '1',
          },
          n: {
            description: 'number of clear-sky pixels',
            dimensions: ['time', 'lat', 'lon'],
            type: 'auxiliary',
          },
          ncld: {
            description: 'number of cloudy pixels',
            dimensions: ['time', 'lat', 'lon'],
            type: 'auxiliary',
          },
        },
        project: 'UK Earth Observation Climate Information Service (EOCIS)',
        institution: 'EOCIS UK',
        resolution: '0.01 degree',
        created: '2025-01-09T09:19:41.429756Z',
        updated: '2025-01-09T10:52:53.693455Z',
      },
      links: [
        {
          rel: 'self',
          type: 'application/geo+json',
          href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/eocis-lst-day/items/a51f96b7-61dd-40e2-a4f2-ede8d0053d45',
        },
        {
          rel: 'parent',
          type: 'application/json',
          href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/eocis-lst-day',
        },
        {
          rel: 'collection',
          type: 'application/json',
          href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/eocis-lst-day',
        },
        {
          rel: 'root',
          type: 'application/json',
          href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue',
        },
      ],
      assets: {
        reference_file: {
          href: 'https://eocis.org/data/eocis-lst-day-kerchunk/2022/12/EOCIS_-LST-L3C-LST-SLSTRB-0.01deg_1DAILY_DAY-20221231000000-fv4.00-kerchunk.json',
          type: 'application/zstd',
          roles: ['reference', 'data'],
          open_kwargs: { open_mapper_kwargs: {}, open_zarr_kwargs: {}, open_xarray_kwargs: {} },
          cloud_format: 'kerchunk',
          checksum: null,
          size: null,
          checksum_type: null,
        },
        'EOCIS_-LST-L3C-LST-SLSTRB-0.01deg_1DAILY_DAY-20221231000000-fv4.00': {
          href: 'https://dap.ceda.ac.uk/neodc/eocis/data/global_and_regional/land_surface_temperature/SENTINEL3B_SLSTR/L3C/0.01/v4.00/daily/2022/12/31/EOCIS_-LST-L3C-LST-SLSTRB-0.01deg_1DAILY_DAY-20221231000000-fv4.00.nc',
          type: 'application/netcdf',
          roles: ['data'],
        },
      },
    }

    return StacFields.formatItemProperties(data) as MetadataItem[]
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
