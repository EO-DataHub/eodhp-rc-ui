import { CheckCircledIcon } from '@radix-ui/react-icons'
import { Badge, Flex, Heading, Link, Table, Text } from '@radix-ui/themes'

// temporary because the date string in the data looks really weird
function formatCustomDate(timestamp: string) {
  const year = timestamp.substring(0, 4)
  const month = timestamp.substring(4, 6)
  const day = timestamp.substring(6, 8)

  return `${day}/${month}/${year}`
}

const sampleData = {
  data_collection: 'PSScene',
  data_id_field:
    'https://staging.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/catalogs/planet/collections/PSScene',
  uuid: 'uuid',
  check_name: 'radiometric uncertainty',
  results: {
    'data validation': {
      'radiometric uncertainty': {
        metric:
          'https://eodatahub.org.uk/api/ontologies/qa/metrics/data-validation/radiometric-uncertainty',
        value: ['partial pass', ['pass', 'fail', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass']],
        stated_value: [
          [
            '8.0% (coastal blue)',
            '6.8% (blue)',
            '6.2% (green_i)',
            '5.6% (green_ii)',
            '5.8% (yellow)',
            '6.3% (red)',
            '8.7% (red edge)',
            '9.2% (NIR)',
          ],
        ],
        links: [
          {
            rel: 'https://eodatahub.org.uk/api/ontologies/qa/detailed-result-report',
            type: 'application/pdf',
            href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/detailed-report.pdf',
            title: 'Detailed QA Check Report for radiometric uncertainty',
          },
          {
            rel: 'https://eodatahub.org.uk/api/ontologies/qa/data_product_report',
            type: 'application/pdf',
            href: 'https://support.planet.com/hc/en-us/articles/360037649554-L1-Data-Quality-Reports-for-the-PlanetScope-Constellation',
            title:
              'PLANET L1 DATA QUALITY REPORT, SUPERDOVE 8-BAND GENERAL AVAILABILITY: Status of Calibration and Data Quality for the SuperDove 8-Band GA, 15/06/21',
          },
          {
            rel: 'https://eodatahub.org.uk/api/ontologies/qa/data-visualisation',
            type: 'application/pdf',
            href: 'http://ceos-dashboard.eba-krpcapwh.eu-west-2.elasticbeanstalk.com/ceos-dashboard?sat=planet&refs=RCN-GONA&bands=490,565,665&date=2022-01-01,2022-01-31',
            title:
              'Dashboard displaying detailed QA information for the radiometric uncertainty check',
          },
        ],
      },
    },
  },
  result_vocab: 'vocab/url',
  check_datetime: '20250321T153304.964683',
  check_datetime_validity_start: '20220101T000000.000000',
  check_datetime_validity_end: '20220131T000000.000000',
  check_creator: 'S Malone',
  contact_point: 'samantha.malone@npl.co.uk',
  publisher: 'Climate and Earth Observation Group, National Physical Laboratory',
  eodh_qa_check_version: 1.0,
}

const statusMapping = {
  pass: 'Pass',
  fail: 'Fail',
  'partial pass': 'Partial Pass',
}

const statusColorMapping = {
  pass: 'green',
  fail: 'red',
  'partial pass': 'orange',
}

type Status = keyof typeof statusMapping

const renderStatusCell = (status: Status) => {
  return (
    <Table.Cell>
      <Badge color={statusColorMapping[status] as 'green' | 'red' | 'orange'}>
        {statusMapping[status]}
      </Badge>
    </Table.Cell>
  )
}

export const ProductValidationSection = () => {
  const tableData = sampleData.results['data validation']['radiometric uncertainty']
  const timePeriod = `${formatCustomDate(sampleData.check_datetime_validity_start)} - ${formatCustomDate(sampleData.check_datetime_validity_end)}`
  const metrics = tableData.stated_value[0].map((item) => item.split('%')[0])
  const bands = tableData.stated_value[0].map((item) => {
    const match = item.match(/\((.*?)\)/)
    return match ? match[1] : ''
  })
  const statuses = tableData.value[1]
  const overallStatus = tableData.value[0] as Status

  const rows = bands.map((band, i) => ({
    metric: metrics[i],
    band,
    status: statuses[i],
  }))

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="4" align="start">
        <Heading as="h3" size="4" weight="medium">
          Radiometric Uncertainty
        </Heading>
        <Text>
          <Text weight="medium">Time Period: </Text>
          <Text>{timePeriod}</Text>
        </Text>
        <Badge
          radius="full"
          size="3"
          color={statusColorMapping[overallStatus] as 'green' | 'red' | 'orange'}
        >
          <CheckCircledIcon />
          Status: {statusMapping[overallStatus]}
        </Badge>
        <Table.Root variant="surface" layout="fixed" style={{ maxWidth: 500 }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Bands</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Metric</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {rows.map((row, index) => (
              <Table.Row key={index}>
                <Table.RowHeaderCell>{row.band}</Table.RowHeaderCell>
                <Table.Cell>{row.metric}%</Table.Cell>
                {renderStatusCell(row.status as 'pass' | 'fail' | 'partial pass')}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <Flex direction="column" align="start">
          <Heading as="h3" size="4" mb="2" weight="medium">
            Additional Information
          </Heading>
          <Flex direction="column" gap="2">
            {tableData.links.map((data) => (
              <Link
                key={data.rel}
                href={data.href}
                target="_blank"
                underline="always"
                weight="medium"
              >
                {data.title}
              </Link>
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
