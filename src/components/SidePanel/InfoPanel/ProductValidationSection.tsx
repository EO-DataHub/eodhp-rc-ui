import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { fetchCollectionQAJsonAsset } from '@/services/collectionService'
import { Collection, CollectionRadiometricAggregatePayload } from '@/types'
import { CheckCircledIcon } from '@radix-ui/react-icons'
import { Badge, Flex, Heading, Link, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { findQALinkByRel } from '@/library/collectionQuality'
import { RadiometricPeriodPicker, RadiometricStatus } from './RadiometricPeriodPicker'
import { qaValidationIntro, qaValidationMethodLeadIn } from './qaIntroCopy'

function formatWindowKeyLabel(key: string) {
  const [start, end] = key.split(',')
  const fmtIso = (iso: string) => {
    const parts = iso.trim().split('-')
    if (parts.length !== 3) return iso.trim()
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  const startLabel = start ? fmtIso(start) : ''
  const endLabel = end ? fmtIso(end) : ''
  return endLabel ? `${startLabel} - ${endLabel}` : startLabel
}

/** Newest first; keys whose start date cannot be parsed go last. */
function sortRadiometricWindowKeys(keys: string[]): string[] {
  const parseStart = (k: string) => new Date(k.split(',')[0]?.trim() ?? '').getTime()
  return [...keys].sort((a, b) => {
    const startA = parseStart(a)
    const startB = parseStart(b)
    if (Number.isNaN(startA)) return Number.isNaN(startB) ? 0 : 1
    if (Number.isNaN(startB)) return -1
    return startB - startA
  })
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

type Status = RadiometricStatus

const renderStatusCell = (status: Status) => {
  return (
    <Table.Cell>
      <Badge color={statusColorMapping[status] as 'green' | 'red' | 'orange'}>
        {statusMapping[status]}
      </Badge>
    </Table.Cell>
  )
}

export const ProductValidationSection = ({ collection }: { collection: Collection }) => {
  const radiometricHref = collection.assets?.qa_radiometric?.href

  const { data, isLoading } = useQuery({
    queryKey: ['CollectionRadiometricQA', collection.id, radiometricHref],
    queryFn: () => {
      if (!radiometricHref) return null
      return fetchCollectionQAJsonAsset<CollectionRadiometricAggregatePayload>(radiometricHref)
    },
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: Boolean(radiometricHref),
  })

  const sortedKeys = useMemo(() => sortRadiometricWindowKeys(Object.keys(data ?? {})), [data])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    setSelectedKey(null)
  }, [collection.id, radiometricHref])

  const activeKey = useMemo(() => {
    if (sortedKeys.length === 0) return null
    if (selectedKey && sortedKeys.includes(selectedKey)) return selectedKey
    return sortedKeys[0]
  }, [sortedKeys, selectedKey])

  const output = activeKey && data?.[activeKey] ? data[activeKey] : undefined

  const getStatus = useCallback(
    (key: string) =>
      data?.[key]?.results['data validation']['radiometric uncertainty']?.value[0] as
        | Status
        | undefined,
    [data],
  )

  if (!radiometricHref) {
    return 'Product validation metrics not available for this collection.'
  }

  if (isLoading) {
    return (
      <Flex gap="3" align="center">
        <LoadingIndicator size="3" />
        <Text>Loading data...</Text>
      </Flex>
    )
  }

  if (!output || sortedKeys.length === 0) {
    return 'Product validation metrics not available for this collection.'
  }

  const tableData = output.results['data validation']['radiometric uncertainty']
  const metrics = tableData?.stated_value.map((item) => item.split('%')[0])
  const bands = tableData?.stated_value.map((item) => {
    const match = item.match(/\((.*?)\)/)
    return match ? match[1] : ''
  })
  const statuses = tableData?.value[1]
  const overallStatus = tableData?.value[0] as Status

  const rows = bands?.map((band, i) => ({
    metric: metrics?.[i],
    band,
    status: statuses?.[i],
  }))

  const productReportLink = findQALinkByRel(tableData?.links, 'data_product_report')
  const methodReportLink = findQALinkByRel(tableData?.links, 'detailed_result_report')

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="2" maxWidth="700px">
        <Text as="p">
          {qaValidationIntro}
          {methodReportLink && (
            <>
              {' '}
              {qaValidationMethodLeadIn}{' '}
              <Link
                href={methodReportLink.href}
                target="_blank"
                rel="noopener noreferrer"
                underline="always"
              >
                {methodReportLink.title || 'Validation Workflow Description'}
              </Link>
              .
            </>
          )}
        </Text>
      </Flex>

      <Flex direction="column" gap="4" align="start">
        <Heading as="h3" size="4" weight="medium">
          Radiometric Uncertainty
        </Heading>
        <Flex direction="column" gap="2">
          <Text weight="medium">Time Period</Text>
          <RadiometricPeriodPicker
            windowKeys={sortedKeys}
            activeKey={activeKey ?? ''}
            getStatus={getStatus}
            formatKeyLabel={formatWindowKeyLabel}
            onSelect={setSelectedKey}
          />
        </Flex>

        <Flex align="center" gap="3" wrap="wrap">
          <Badge
            radius="full"
            size="3"
            color={statusColorMapping[overallStatus] as 'green' | 'red' | 'orange'}
          >
            <CheckCircledIcon />
            Status: {statusMapping[overallStatus]}
          </Badge>
          {activeKey && <Text color="gray">{formatWindowKeyLabel(activeKey)}</Text>}
        </Flex>

        <Table.Root variant="surface" layout="fixed" style={{ maxWidth: 500 }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Bands</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Metric</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {rows?.map((row, index) => (
              <Table.Row key={index}>
                <Table.RowHeaderCell>{row.band}</Table.RowHeaderCell>
                <Table.Cell>
                  {productReportLink ? (
                    <Link
                      href={productReportLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="always"
                      title={productReportLink.title}
                    >
                      {row.metric}%
                    </Link>
                  ) : (
                    `${row.metric}%`
                  )}
                </Table.Cell>
                {renderStatusCell(row.status as Status)}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <Flex direction="column" align="start">
          <Heading as="h3" size="4" mb="2" weight="medium">
            Additional Information
          </Heading>
          <Flex direction="column" gap="2">
            {tableData?.links.map((link, index) => (
              <Link
                key={`${link.rel}-${link.href}-${index}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                underline="always"
                weight="medium"
              >
                {link.title}
              </Link>
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
