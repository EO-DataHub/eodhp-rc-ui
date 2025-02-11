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
                      <Table.RowHeaderCell key={headerKey}>
                        {content}
                      </Table.RowHeaderCell>
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

    // TODO: Sample data for testing purpose, will remove later
    // const data = {"type":"Feature","stac_version":"1.0.0","stac_extensions":["https://stac-extensions.github.io/projection/v1.1.0/schema.json","https://stac-extensions.github.io/classification/v1.0.0/schema.json"],"id":"ESACCI-LC-L4-LCCS-Map-300m-P1Y-2004-v2.0.7","collection":"land_cover","geometry":{"type":"Polygon","coordinates":[[[-180.0,-90.0],[180.0,-90.0],[180.0,90.0],[-180.0,90.0],[-180.0,-90.0]]]},"bbox":[-180.0,-90.0,180.0,90.0],"properties":{"datetime":"2004-07-01T12:00:00Z","updated":"2024-12-17T13:21:27.575517Z","start_datetime":"2004-01-01T00:00:00Z","end_datetime":"2004-12-31T00:00:00Z","license":"ESA CCI Data Policy: free and open access","proj:code":"EPSG:4326","proj:transform":[0.002777777777778,0.0,0.0,-0.002777777777778,-180.0,90.0],"TileSize":"2048:2048","version":"2.0.7","date_created":"2017-06-16T12:03:07Z","spatial_resolution":"300m","geospatial_lat_resolution":"0.002778","geospatial_lon_resolution":"0.002778","created":"2024-09-07T13:52:48.783796Z"},"links":[{"rel":"self","type":"application/geo+json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/land_cover/items/ESACCI-LC-L4-LCCS-Map-300m-P1Y-2004-v2.0.7"},{"rel":"parent","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/land_cover"},{"rel":"collection","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/land_cover"},{"rel":"root","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue"}],"assets":{"GeoTIFF":{"href":"https://dap.ceda.ac.uk/neodc/esacci/land_cover/data/land_cover_maps/v2.0.7/ESACCI-LC-L4-LCCS-Map-300m-P1Y-2004-v2.0.7.tif","role":["data"],"classification:classes":[{"value":0,"description":"No data","color-hint":"000000"},{"value":10,"description":"Cropland, rainfed","color-hint":"ffff64"},{"value":11,"description":"Herbaceous cover","color-hint":"ffff64"},{"value":12,"description":"Tree or shrub cover","color-hint":"ffff00"},{"value":20,"description":"Cropland, irrigated or post-flooding","color-hint":"aaf0f0"},{"value":30,"description":"Mosaic cropland (>50%) / natural vegetation (tree, shrub, herbaceous cover) (<50%)","color-hint":"dbf064"},{"value":40,"description":"Mosaic natural vegetation (tree, shrub, herbaceous cover) (>50%) / cropland (<50%) ","color-hint":"c8c864"},{"value":50,"description":"Tree cover, broadleaved, evergreen, closed to open (>15%)","color-hint":"006400"},{"value":60,"description":"Tree cover, broadleaved, deciduous, closed to open (>15%)","color-hint":"00a000"},{"value":61,"description":"Tree cover, broadleaved, deciduous, closed (>40%)","color-hint":"00a000"},{"value":62,"description":"Tree cover, broadleaved, deciduous, open (15-40%)","color-hint":"aac800"},{"value":70,"description":"Tree cover, needleleaved, evergreen, closed to open (>15%)","color-hint":"003c00"},{"value":71,"description":"Tree cover, needleleaved, evergreen, closed (>40%)","color-hint":"003c00"},{"value":72,"description":"Tree cover, needleleaved, evergreen, open (15-40%)","color-hint":"005000"},{"value":80,"description":"Tree cover, needleleaved, deciduous, closed to open (>15%)","color-hint":"4005000"},{"value":81,"description":"Tree cover, needleleaved, deciduous, closed (>40%)","color-hint":"4005000"},{"value":82,"description":"Tree cover, needleleaved, deciduous, open (15-40%)","color-hint":"4006400"},{"value":90,"description":"Tree cover, mixed leaf type (broadleaved and needleleaved)","color-hint":"788200"},{"value":100,"description":"Mosaic tree and shrub (>50%) / herbaceous cover (<50%)","color-hint":"1400a000"},{"value":110,"description":"Mosaic herbaceous cover (>50%) / tree and shrub (<50%)","color-hint":"be9500"},{"value":120,"description":"Shrubland","color-hint":"15006400"},{"value":121,"description":"Shrubland evergreen","color-hint":"784c00"},{"value":122,"description":"Shrubland deciduous","color-hint":"15006400"},{"value":130,"description":"Grassland","color-hint":"ffb432"},{"value":140,"description":"Lichens and mosses","color-hint":"ffdcd2"},{"value":150,"description":"Sparse vegetation (tree, shrub, herbaceous cover) (<15%)","color-hint":"ffebaf"},{"value":151,"description":"Sparse tree (<15%)","color-hint":"ffc964"},{"value":152,"description":"Sparse shrub (<15%)","color-hint":"ffd278"},{"value":153,"description":"Sparse herbaceous cover (<15%)","color-hint":"ffebaf"},{"value":160,"description":"Tree cover, flooded, fresh or brakish water","color-hint":"00785a"},{"value":170,"description":"Tree cover, flooded, saline water","color-hint":"009678"},{"value":180,"description":"Shrub or herbaceous cover, flooded, fresh/saline/brakish water","color-hint":"00dc80"},{"value":190,"description":"Urban areas","color-hint":"c31300"},{"value":200,"description":"Bare areas","color-hint":"fff5d7"},{"value":201,"description":"Consolidated bare areas","color-hint":"dcdcdc"},{"value":202,"description":"Unconsolidated bare areas","color-hint":"fff5d7"},{"value":210,"description":"Water bodies","color-hint":"0046c8"},{"value":220,"description":"Permanent snow and ice","color-hint":"ffffff"}]},"NetCDF":{"href":"https://dap.ceda.ac.uk/neodc/esacci/land_cover/data/land_cover_maps/v2.0.7/ESACCI-LC-L4-LCCS-Map-300m-P1Y-2004-v2.0.7b.nc","role":["data"],"classification:classes":[{"value":0,"description":"No data","color-hint":"000000"},{"value":10,"description":"Cropland, rainfed","color-hint":"ffff64"},{"value":11,"description":"Herbaceous cover","color-hint":"ffff64"},{"value":12,"description":"Tree or shrub cover","color-hint":"ffff00"},{"value":20,"description":"Cropland, irrigated or post-flooding","color-hint":"aaf0f0"},{"value":30,"description":"Mosaic cropland (>50%) / natural vegetation (tree, shrub, herbaceous cover) (<50%)","color-hint":"dbf064"},{"value":40,"description":"Mosaic natural vegetation (tree, shrub, herbaceous cover) (>50%) / cropland (<50%) ","color-hint":"c8c864"},{"value":50,"description":"Tree cover, broadleaved, evergreen, closed to open (>15%)","color-hint":"006400"},{"value":60,"description":"Tree cover, broadleaved, deciduous, closed to open (>15%)","color-hint":"00a000"},{"value":61,"description":"Tree cover, broadleaved, deciduous, closed (>40%)","color-hint":"00a000"},{"value":62,"description":"Tree cover, broadleaved, deciduous, open (15-40%)","color-hint":"aac800"},{"value":70,"description":"Tree cover, needleleaved, evergreen, closed to open (>15%)","color-hint":"003c00"},{"value":71,"description":"Tree cover, needleleaved, evergreen, closed (>40%)","color-hint":"003c00"},{"value":72,"description":"Tree cover, needleleaved, evergreen, open (15-40%)","color-hint":"005000"},{"value":80,"description":"Tree cover, needleleaved, deciduous, closed to open (>15%)","color-hint":"4005000"},{"value":81,"description":"Tree cover, needleleaved, deciduous, closed (>40%)","color-hint":"4005000"},{"value":82,"description":"Tree cover, needleleaved, deciduous, open (15-40%)","color-hint":"4006400"},{"value":90,"description":"Tree cover, mixed leaf type (broadleaved and needleleaved)","color-hint":"788200"},{"value":100,"description":"Mosaic tree and shrub (>50%) / herbaceous cover (<50%)","color-hint":"1400a000"},{"value":110,"description":"Mosaic herbaceous cover (>50%) / tree and shrub (<50%)","color-hint":"be9500"},{"value":120,"description":"Shrubland","color-hint":"15006400"},{"value":121,"description":"Shrubland evergreen","color-hint":"784c00"},{"value":122,"description":"Shrubland deciduous","color-hint":"15006400"},{"value":130,"description":"Grassland","color-hint":"ffb432"},{"value":140,"description":"Lichens and mosses","color-hint":"ffdcd2"},{"value":150,"description":"Sparse vegetation (tree, shrub, herbaceous cover) (<15%)","color-hint":"ffebaf"},{"value":151,"description":"Sparse tree (<15%)","color-hint":"ffc964"},{"value":152,"description":"Sparse shrub (<15%)","color-hint":"ffd278"},{"value":153,"description":"Sparse herbaceous cover (<15%)","color-hint":"ffebaf"},{"value":160,"description":"Tree cover, flooded, fresh or brakish water","color-hint":"00785a"},{"value":170,"description":"Tree cover, flooded, saline water","color-hint":"009678"},{"value":180,"description":"Shrub or herbaceous cover, flooded, fresh/saline/brakish water","color-hint":"00dc80"},{"value":190,"description":"Urban areas","color-hint":"c31300"},{"value":200,"description":"Bare areas","color-hint":"fff5d7"},{"value":201,"description":"Consolidated bare areas","color-hint":"dcdcdc"},{"value":202,"description":"Unconsolidated bare areas","color-hint":"fff5d7"},{"value":210,"description":"Water bodies","color-hint":"0046c8"},{"value":220,"description":"Permanent snow and ice","color-hint":"ffffff"}]}}}
    // const data = {"type":"Feature","stac_version":"1.0.0","stac_extensions":[],"id":"ukcp.land-rcm.uk.12km.rcp85.15.pr.day.v20190731","collection":"ukcp","geometry":{"coordinates":[[[-8.18,49.86],[-8.18,60.86],[1.76,60.86],[1.76,49.86],[-8.18,49.86]]],"type":"Polygon"},"bbox":[49.86,-8.18,60.86,1.76],"properties":{"file_count":2,"Conventions":"CF-1.5","references":"https://ukclimateprojections.metoffice.gov.uk","start_datetime":"2060-12-01T12:00:00Z","end_datetime":"2080-11-30T12:00:00Z","sub_collection":"land-rcm","variable_long_name":"Precipitation rate","created":"2024-01-29T12:02:06.535078Z","dataset_id":"ukcp.land-rcm.uk.12km.rcp85.15.pr.day.v20190731","variable_units":"mm/day","project":"UKCP18","cf_standard_name":"lwe_precipitation_rate","kerchunk_href":"https://dap.ceda.ac.uk/badc/cmip18/metadata/kerchunk/by_dset/UKCP/land-rcm/uk/12km/rcp85/pr/day/ukcp.land-rcm.uk.12km.rcp85.15.pr.day.v20190731.zstd","resolution":"12km","version":"v20190731","frequency":"day","institution":"Met Office Hadley Centre (MOHC), FitzRoy Road, Exeter, Devon, EX1 3PB, UK.","datetime":"2070-12-01T12:00:00Z","size":266749994,"scenario":"rcp85","domain":"uk","var_id":"pr","updated":"2024-12-17T13:24:16.754989Z","latest":true},"links":[{"rel":"self","type":"application/geo+json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/ukcp/items/ukcp.land-rcm.uk.12km.rcp85.15.pr.day.v20190731"},{"rel":"parent","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/ukcp"},{"rel":"collection","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/ukcp"},{"rel":"root","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue"}],"assets":{"reference_file":{"checksum_type":null,"size":null,"open_zarr_kwargs":{"decode_times":true},"roles":["reference","data"],"checksum":null,"href":"https://dap.ceda.ac.uk/badc/cmip18/metadata/kerchunk/by_dset/UKCP/land-rcm/uk/12km/rcp85/pr/day/ukcp.land-rcm.uk.12km.rcp85.15.pr.day.v20190731.zstd","type":"application/zstd"},"data0001":{"checksum_type":null,"size":133374997,"start_datetime":"2060-12-01T00:00:00","end_datetime":"2070-11-30T23:59:59","roles":["data"],"bbox":[-18.24145632530888,-0.8710618968191547,-6.580251255557555,12.94984143216418],"checksum":null,"location":"on_disk","href":"https://dap.ceda.ac.uk/badc/ukcp18/data/land-rcm/uk/12km/rcp85/15/pr/day/v20190731/pr_rcp85_land-rcm_uk_12km_15_day_20601201-20701130.nc","type":"application/netcdf"},"data0002":{"checksum_type":null,"size":133374997,"start_datetime":"2070-12-01T00:00:00","end_datetime":"2080-11-30T23:59:59","roles":["data"],"bbox":[-18.24145632530888,-0.8710618968191547,-6.580251255557555,12.94984143216418],"checksum":null,"location":"on_disk","href":"https://dap.ceda.ac.uk/badc/ukcp18/data/land-rcm/uk/12km/rcp85/15/pr/day/v20190731/pr_rcp85_land-rcm_uk_12km_15_day_20701201-20801130.nc","type":"application/netcdf"}}}
    // const data = {"type":"Feature","stac_version":"1.0.0","stac_extensions":["https://stac-extensions.github.io/eo/v2.0.0/schema.json","https://stac-extensions.github.io/sat/v1.0.0/schema.json","https://stac-extensions.github.io/view/v1.0.0/schema.json"],"id":"ACQ_CP_PNEO3_007161_0010523787_ST_0-21","collection":"airbus_pneo_data","geometry":{"type":"Polygon","coordinates":[[[77.27526713694587,28.67344159468971],[77.1314545271,28.6731374343],[77.1313761617,28.5543842588],[77.2772155253,28.553964035],[77.27724394000393,28.67341216214727],[77.27526713694587,28.67344159468971]]]},"bbox":[77.1313761617,28.553964035,77.27724394000393,28.67344159468971],"properties":{"access":["HTTPServer"],"datetime":"2021-10-12T05:41:24.846Z","updated":"2024-12-17T12:48:18.883645Z","gsd":0.3,"eo:cloud_cover":0,"eo:snow_cover":0,"view:azimuth":180.06078635225032,"view:sun_azimuth":53.902192115694,"view:sun_elevation":62.19895908855872,"view:incidence_angle":12.769099234753991,"acquisition_identifier":"ACQ_CP_PNEO3_007161_0010523787_ST_0-21","activity_id":"f4897d9b-1f54-4549-97dc-5cc74bc974ea","constellation":"PNEO","correlation_id":"02abba56-3ec5-4757-8237-2d6b55eb5eb7","expiration_date":"2223-08-23T15:22:10.945600873Z","format":"image/tiff","geometry_centroid":{"lat":28.61371100417368,"lon":77.2043100508529},"id":"04cff38d-1e35-4335-bd92-9cdb4fa0e88e","incidence_angle_across_track":-0.9606704625948274,"incidence_angle_along_track":-29.105034245735734,"organisation_name":"AIRBUS DS GEO","platform":"PNEO3","processing_center":"MOC","processing_date":"2021-10-12T08:00:06.307Z","processing_level":"ALBUM","processor_name":"MMCAT","product_category":"coupling","product_type":"stereo","production_status":"ARCHIVED","publication_date":"2023-10-10T15:24:35.044267541Z","qualified":false,"sensor_type":"OPTICAL","spectral_range":"VISIBLE","title":"","workspace_id":"3e88441b-adc9-4be6-bd80-59d4fb69d5a7","workspace_name":"public-pneo","workspace_title":"Workspace temporaire pour la data pneo","archived":true,"bh":0.20672284028759222,"composed_of_acquisition_identifiers":["ACQ_PNEO3_00716100540188","ACQ_PNEO3_00716100540189"],"composed_of_archive_anonymous_identifiers":["c444aa31a30e82710cb39f71686c14ae","b030d1ad8241fe968d09f650551d9a9c"],"image_quality_defects":0,"created":"2024-12-17T12:48:18.883645Z"},"links":[{"rel":"self","type":"application/geo+json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/airbus/collections/airbus_pneo_data/items/ACQ_CP_PNEO3_007161_0010523787_ST_0-21"},{"rel":"parent","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/airbus/collections/airbus_pneo_data"},{"rel":"collection","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/airbus/collections/airbus_pneo_data"},{"rel":"root","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/airbus"},{"rel":"quicklook","href":"https://test.eodatahub.org.uk/api/v1/items/04cff38d-1e35-4335-bd92-9cdb4fa0e88e/quicklook","type":"application/octet-stream"},{"rel":"thumbnail","href":"https://test.eodatahub.org.uk/api/v1/items/04cff38d-1e35-4335-bd92-9cdb4fa0e88e/thumbnail","type":"application/octet-stream"}],"assets":{"quicklook":{"href":"https://access.foundation.api.oneatlas.airbus.com/api/v1/items/04cff38d-1e35-4335-bd92-9cdb4fa0e88e/quicklook","type":"application/octet-stream"},"thumbnail":{"href":"https://access.foundation.api.oneatlas.airbus.com/api/v1/items/04cff38d-1e35-4335-bd92-9cdb4fa0e88e/thumbnail","type":"application/octet-stream"}}}
    const data = {"type":"Feature","stac_version":"1.0.0","stac_extensions":["https://stac-extensions.github.io/datacube/v2.2.0/schema.json","https://stac-extensions.github.io/scientific/v1.0.0/schema.json"],"id":"a51f96b7-61dd-40e2-a4f2-ede8d0053d45","collection":"eocis-lst-day","geometry":{"type":"Polygon","coordinates":[[[-179.9949951171875,-89.99500274658203],[179.9949951171875,-89.99500274658203],[179.9949951171875,89.99498748779297],[-179.9949951171875,89.99498748779297],[-179.9949951171875,-89.99500274658203]]]},"bbox":[-179.9949951171875,-89.99500274658203,179.9949951171875,89.99498748779297],"properties":{"title":"EOCIS land surface temperature daytime data at product level L3C from Sea and Land Surface Temperature Radiometer A and B.","description":"This file contains level L3C global land surface temperatures from SLSTR. L3C data are derived from multiple orbits of single sensor L3U data combined onto a space and/or time grid.","datetime":"2022-12-31T00:00:00Z","license":"cc-by-4.0","platform":"Sentinel3B","instruments":["SLSTR"],"cube:dimensions":{"lon":{"type":"spatial","axis":"x","extent":[-180,180],"reference_system":4326,"unit":"degrees_east"},"lat":{"type":"spatial","axis":"y","extent":[-90,90],"reference_system":4326,"unit":"degrees_north"},"time":{"type":"temporal","step":"P1D","values":["2022-12-31T00:00:00Z"]}},"cube:variables":{"lst":{"description":"land surface temperature","dimensions":["time","lat","lon"],"type":"data","unit":"kelvin"},"lst_uncertainty":{"description":"land surface temperature total uncertainty","dimensions":["time","lat","lon"],"type":"data","unit":"kelvin"},"ndvi":{"description":"normalized difference vegetation index","dimensions":["time","lat","lon"],"type":"data","unit":"1"},"emis":{"description":"surface emissivity","dimensions":["time","lat","lon"],"type":"data","unit":"1"},"n":{"description":"number of clear-sky pixels","dimensions":["time","lat","lon"],"type":"auxiliary"},"ncld":{"description":"number of cloudy pixels","dimensions":["time","lat","lon"],"type":"auxiliary"}},"project":"UK Earth Observation Climate Information Service (EOCIS)","institution":"EOCIS UK","resolution":"0.01 degree","created":"2025-01-09T09:19:41.429756Z","updated":"2025-01-09T10:52:53.693455Z"},"links":[{"rel":"self","type":"application/geo+json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/eocis-lst-day/items/a51f96b7-61dd-40e2-a4f2-ede8d0053d45"},{"rel":"parent","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/eocis-lst-day"},{"rel":"collection","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/eocis-lst-day"},{"rel":"root","type":"application/json","href":"https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue"}],"assets":{"reference_file":{"href":"https://eocis.org/data/eocis-lst-day-kerchunk/2022/12/EOCIS_-LST-L3C-LST-SLSTRB-0.01deg_1DAILY_DAY-20221231000000-fv4.00-kerchunk.json","type":"application/zstd","roles":["reference","data"],"open_kwargs":{"open_mapper_kwargs":{},"open_zarr_kwargs":{},"open_xarray_kwargs":{}},"cloud_format":"kerchunk","checksum":null,"size":null,"checksum_type":null},"EOCIS_-LST-L3C-LST-SLSTRB-0.01deg_1DAILY_DAY-20221231000000-fv4.00":{"href":"https://dap.ceda.ac.uk/neodc/eocis/data/global_and_regional/land_surface_temperature/SENTINEL3B_SLSTR/L3C/0.01/v4.00/daily/2022/12/31/EOCIS_-LST-L3C-LST-SLSTRB-0.01deg_1DAILY_DAY-20221231000000-fv4.00.nc","type":"application/netcdf","roles":["data"]}}}

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
