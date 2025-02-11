import React, { useMemo } from 'react'
import { Heading, Flex, Table } from '@radix-ui/themes'
import type { Item } from '@/types'
import StacFields from '@radiantearth/stac-fields'
import styles from './MoreInfoPanel.module.scss'

interface MetadataSectionProps {
  item: Item | null
}

interface MetadataProperties {
  label: string
  formatted: string
  value: string | number | { [key: string]: unknown }
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
  return (
    <Flex direction="column" gap="4" key={extension} className={styles.tableContainer}>
      <Heading as="h3" size="3" weight="bold">
        {label ? label : 'General'}
      </Heading>
      {Object.keys(properties).map((key) => (
        <Flex key={key} direction="column" gap="1">
          <Heading as="h4" size="2" weight="medium">
            {properties[key].label ? properties[key].label : 'General'}
          </Heading>
          <Table.Root size="2" variant="ghost" layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                {properties[key].itemOrder?.map((itemKey) => (
                  <Table.ColumnHeaderCell
                    key={itemKey}
                    dangerouslySetInnerHTML={{
                      __html: properties[key].items?.[itemKey]?.label ?? '',
                    }}
                  ></Table.ColumnHeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Object.keys(properties[key].value).map((itemKey) => (
                <Table.Row key={itemKey}>
                  <Table.RowHeaderCell width="160px">{itemKey}</Table.RowHeaderCell>
                  {properties[key].itemOrder?.map((childKey) => (
                    <Table.Cell
                      key={childKey}
                      dangerouslySetInnerHTML={{
                        __html: StacFields.format(properties[key].value[itemKey][childKey]),
                      }}
                    ></Table.Cell>
                  ))}
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

    const ret = StacFields.formatItemProperties(data) as MetadataItem[]
    console.log(ret)
    return ret
  }, [item])

  return (
    <Flex direction="column" gap="5">
      {/* {showHeading && <Heading as="h2">Metadata</Heading>} */}

      {metadata.map((metadataItem) =>
        metadataItem.extension === 'cube'
          ? renderCubeTable(metadataItem)
          : renderTable(metadataItem),
      )}
    </Flex>
  )
}
