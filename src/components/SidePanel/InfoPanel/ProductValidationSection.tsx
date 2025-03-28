import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import {
  collectionCategorization,
  isValidCollectionId,
} from '@/constants/collectionCategorizations'
import { fetchDocumentQA } from '@/services/collectionService'
import { Collection, DocumentRadiometricOutput } from '@/types'
import { CheckCircledIcon } from '@radix-ui/react-icons'
import { Badge, Flex, Heading, Link, Select, Table, Text } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

// temporary because the date string in the data looks really weird
function formatCustomDate(timestamp: string | undefined) {
  if (!timestamp) {
    return ''
  }
  const year = timestamp.substring(0, 4)
  const month = timestamp.substring(4, 6)
  const day = timestamp.substring(6, 8)

  return `${day}/${month}/${year}`
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

export const ProductValidationSection = ({ collection }: { collection: Collection }) => {
  const qaDocumentExists =
    isValidCollectionId(collection.id) && collectionCategorization[collection.id].qa

  const [qaOutputUrl, setQaOutputUrl] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['CollectionQARadiometric', collection.id],
    queryFn: () => {
      if (!isValidCollectionId(collection.id)) return null

      const qaCatalog = collectionCategorization[collection.id].qa
      return fetchDocumentQA(qaCatalog, 'qa_radiometric')
    },
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: isValidCollectionId(collection.id),
  })

  const selectOptions = useMemo(() => {
    return data?.features.map((feature) => {
      const label = `${formatCustomDate(feature.properties.check_validity_start_datetime)} - ${formatCustomDate(feature.properties.check_validity_end_datetime)}`
      return {
        label,
        value: feature.assets?.['qa-outputs'].href,
      }
    })
  }, [data?.features])

  // const qaOutputUrl = data?.features?.[0].assets?.['qa-outputs'].href

  const {
    data: output,
    isLoading: isOutputQueryLoading,
    status,
  } = useQuery<DocumentRadiometricOutput>({
    queryKey: ['CollectionQARadiometricOutput', collection.id, qaOutputUrl],
    queryFn: async () => {
      if (!qaOutputUrl) {
        return null
      }
      const response = await fetch(qaOutputUrl, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      return response.json()
    },
    refetchOnWindowFocus: false,
    // enabled: !!qaOutputUrl,
  })

  useEffect(() => {
    if (status === 'success' && !qaOutputUrl) {
      setQaOutputUrl(data?.features?.[0].assets?.['qa-outputs'].href)
    }
  }, [data?.features, qaOutputUrl, status])

  if (!qaDocumentExists) {
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

  if (!output && !isOutputQueryLoading) {
    return 'Product validation metrics not available for this collection.'
  }

  const tableData = output?.results['data validation']['radiometric uncertainty']
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

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="4" align="start">
        <Heading as="h3" size="4" weight="medium">
          Radiometric Uncertainty
        </Heading>
        <Flex align="center" gap="2">
          <Text weight="medium">Time Period: </Text>
          <Select.Root value={qaOutputUrl} onValueChange={setQaOutputUrl}>
            <Select.Trigger placeholder="Choose Time Period" />
            <Select.Content>
              {selectOptions?.map(({ label, value }) => (
                <Select.Item value={value} key={value}>
                  {label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>

        {isOutputQueryLoading ? (
          <Flex gap="3" align="center">
            <LoadingIndicator size="3" />
            <Text>Loading data...</Text>
          </Flex>
        ) : (
          <>
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
                {rows?.map((row, index) => (
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
                {tableData?.links.map((data) => (
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
          </>
        )}
      </Flex>
    </Flex>
  )
}
