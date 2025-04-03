import { Flex, Heading, Link, Text } from '@radix-ui/themes'
import styles from './DataQualitySection.module.scss'
import React, { PropsWithChildren } from 'react'
import { LockClosedIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { Collection, DocumentQAOutput } from '@/types'
import { fetchDocumentQA } from '@/services/collectionService'
import {
  collectionCategorization,
  isValidCollectionId,
} from '@/constants/collectionCategorizations'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'

const metricLabelMapping = {
  'not assessed': 'Not Assessed',
  'not assessable': 'Not Assessable',
  basic: 'Basic',
  good: 'Good',
  excellent: 'Excellent',
  ideal: 'Ideal',
  not_public: 'Not Public',
}

const metricColorMapping = {
  'not assessed': '#FFFFFF',
  'not assessable': '#D9D9D9',
  basic: '#92B1C3',
  good: '#64A0DC',
  excellent: '#7DC384',
  ideal: '#47E752',
  not_public: '#FFFFFF',
}

const labelMapping: Record<string, string> = {
  'documentation review': 'Data Provider Documentation Review',

  product_information: 'Product Information',
  product_details: 'Product Details',
  availability_and_accessability: 'Availability & Accessibility',
  product_format_flags_and_metadata: 'Product Format, Flags & Metadata',
  user_documentation: 'User Documentation',

  metrology: 'Metrology',
  radiometric_calibration_and_characterisation: 'Sensor Calibration & Characterisation',
  geometric_calibration_and_characterisation: 'Geometric Calibration & Characterisation',
  metrological_traceability_documentation: 'Metrological Traceability Documentation',
  uncertainty_characterisation: 'Uncertainty Characterisation',
  ancillary_data: 'Ancillary Data',

  product_generation: 'Product Generation',
  radiometric_calibration_algorithm: 'Calibration Algorithm',
  geometric_processing: 'Geometric Processing',
  retrieval_algorithm: 'Retrieval Algorithm',
  mission_specific_processing: 'Mission-Specific Processing',
}

interface CellProps {
  className?: string
  hasBorderBottom?: boolean
  style?: React.CSSProperties
}

const Cell: React.FC<PropsWithChildren<CellProps>> = ({
  children,
  className,
  hasBorderBottom = true,
  style: additionalStyle,
}) => (
  <div
    className={`${styles.cell} ${className}`}
    style={{
      borderBottom: hasBorderBottom ? '1px solid #00002F26' : undefined,
      ...additionalStyle,
    }}
  >
    {children}
  </div>
)

export const DataQualitySection = ({ collection }: { collection: Collection }) => {
  const qaDocumentExists =
    isValidCollectionId(collection.id) && collectionCategorization[collection.id].qa

  const { data, isLoading } = useQuery({
    queryKey: ['CollectionQA', collection.id],
    queryFn: () => {
      if (!isValidCollectionId(collection.id)) return null

      const qaCatalog = collectionCategorization[collection.id].qa
      return fetchDocumentQA(qaCatalog, 'qa_documentation')
    },
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: isValidCollectionId(collection.id),
  })

  const qaOutputUrl = data?.features?.[0].assets?.['qa-outputs'].href

  const { data: output, isLoading: isOutputQueryLoading } = useQuery<DocumentQAOutput>({
    queryKey: ['CollectionQAOutput', collection.id],
    queryFn: async () => {
      if (!qaOutputUrl) return null
      const response = await fetch(qaOutputUrl)
      return response.json()
    },
    refetchOnWindowFocus: false,
    enabled: !!qaOutputUrl,
  })

  if (!qaDocumentExists) {
    return 'Document quality assurance not available for this collection.'
  }

  if (isLoading || isOutputQueryLoading) {
    return (
      <Flex gap="3" align="center">
        <LoadingIndicator size="3" />
        <Text>Loading data...</Text>
      </Flex>
    )
  }

  if (!output) {
    return 'Document quality assurance not available for this collection.'
  }

  const documentReview = output.results || {}

  const rowCount = Math.max(
    ...Object.values(documentReview).map((category) => Object.keys(category).length),
  )

  const metricCount = Object.keys(metricLabelMapping).length

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column">
        <Heading as="h3" size="4" mb="2" weight="medium">
          Documentation Quality Assurance Report
        </Heading>
        <Flex gap="6">
          <Flex
            direction="column"
            width="500px"
            flexShrink="0"
            overflowX="auto"
            className={styles.tableContainer}
          >
            <Cell className={styles.headerCell}>{labelMapping['documentation review']}</Cell>
            <Flex flexGrow="1">
              {Object.entries(documentReview).map(([categoryKey, categoryValue]) => (
                <Flex direction="column" flexGrow="1" flexBasis="0" key={categoryKey}>
                  <Cell
                    className={styles.headerCell}
                    style={{
                      height: 100,
                    }}
                  >
                    {labelMapping[categoryKey] || categoryKey}
                  </Cell>
                  {Object.entries(categoryValue).map(([subKey, data], subKeyIndex) => (
                    <Cell
                      key={subKey}
                      className={styles.bodyCell}
                      style={{
                        backgroundColor:
                          metricColorMapping[data.value as keyof typeof metricColorMapping],
                      }}
                      hasBorderBottom={subKeyIndex < rowCount - 1}
                    >
                      {labelMapping[subKey] || subKey}
                    </Cell>
                  ))}
                </Flex>
              ))}
            </Flex>
          </Flex>
          <Flex
            direction="column"
            minWidth="185px"
            overflowX="auto"
            className={styles.tableContainer}
          >
            <Cell className={styles.headerCell}>Key</Cell>
            {Object.entries(metricLabelMapping).map(([key, label], index) => (
              <Cell
                key={key}
                style={{
                  height: 48,
                  backgroundColor: metricColorMapping[key as keyof typeof metricColorMapping],
                }}
                hasBorderBottom={index < metricCount - 1}
              >
                {key === 'not_public' && <LockClosedIcon width={20} height={20} />}
                {label}
              </Cell>
            ))}
          </Flex>
        </Flex>
      </Flex>

      <Flex direction="column" align="start">
        <Heading as="h3" size="4" mb="2" weight="medium">
          Referenced Documents
        </Heading>
        <Flex direction="column" gap="4" justify="start">
          {Object.entries(documentReview).map(([categoryKey, categoryValue]) => (
            <Flex direction="column" key={categoryKey} gap="1">
              <Heading as="h4" size="3" weight="medium">
                {labelMapping[categoryKey] || categoryKey}
              </Heading>
              {Object.entries(categoryValue).map(
                ([subKey, data]) =>
                  data.links.length > 0 && (
                    <Link
                      key={subKey}
                      href={data.links[0].href}
                      target="_blank"
                      underline="always"
                      weight="medium"
                    >
                      {labelMapping[subKey] || subKey}
                    </Link>
                  ),
              )}
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Flex>
  )
}
