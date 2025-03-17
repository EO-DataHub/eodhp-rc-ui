import { Flex } from '@radix-ui/themes'
import styles from './DataQualitySection.module.scss'
import React, { PropsWithChildren } from 'react'

const metricLabelMapping = {
  not_assessed: 'Not Assessed',
  not_assessable: 'Not Assessable',
  basic: 'Basic',
  good: 'Good',
  excellent: 'Excellent',
  ideal: 'Ideal',
  not_public: 'Not Public',
}

const metricColorMapping = {
  not_assessed: '#FFFFFF',
  not_assessable: '#D9D9D9',
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
  mission_specific_processing: 'Mission-Specific Processin',
}

const sampleData = {
  data_collection: 'Planet Superdove L1C',
  data_id_field: 'doi or STAC url etc',
  uuid: 'uuid',
  check_name: 'documentation review',
  results: {
    'documentation review': {
      product_information: {
        product_details: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-information/product-details',
          value: 'not_public',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        availability_and_accessability: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-information/availability-and-accessability',
          value: 'excellent',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        product_format_flags_and_metadata: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-information/product-format-flags-and-metadata',
          value: 'basic',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        user_documentation: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-information/user-documentation',
          value: 'good',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
      },
      metrology: {
        radiometric_calibration_and_characterisation: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/metrology/radiometric-calibration-and-characterisation',
          value: 'excellent',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        geometric_calibration_and_characterisation: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/metrology/geometric-calibration-and-characterisation',
          value: 'ideal',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        metrological_traceability_documentation: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/metrology/metrological-traceability-documentation',
          value: 'good',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        uncertainty_characterisation: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/metrology/uncertainty-characterisation',
          value: 'good',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        ancillary_data: {
          metric: 'https://eodatahub.org.uk/api/ontologies/qa/metrics/metrology/ancillary-data',
          value: 'good',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
      },
      product_generation: {
        radiometric_calibration_algorithm: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-generation/radiometric-calibration-algorithm',
          value: 'basic',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        geometric_processing: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-generation/geometric-processing',
          value: 'good',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        retrieval_algorithm: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-generation/retrieval-algorithm',
          value: 'excellent',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
        mission_specific_processing: {
          metric:
            'https://eodatahub.org.uk/api/ontologies/qa/metrics/product-generation/mission-specific-processing',
          value: 'good',
          links: [
            {
              rel: 'https://eodatahub.org.uk/api/ontologies/qa/qa-documentation',
              type: 'application/pdf',
              href: 'https://npl-qa-workspace.eodatahub-worksapces.org.uk/files/qa-reports/.../data-collection-uncertainty-documentaion.pdf',
              title: 'Documentation from the data provider used within the documentation review',
            },
          ],
        },
      },
    },
  },
  result_vocab: 'vocab/url',
  check_datetime: '20241119T142022.011479',
  check_datetime_validity_start: '20241119T142022.011479',
  check_datetime_validity_end: '20251119T142022.011479',
  check_creator: 'S Malone',
  contact_point: 'smalone@email',
  publisher: 'Climate and Earth Observation Group, National Physical Laboratory',
  eodh_qa_check_version: 1.0,
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

export const DataQualitySection = () => {
  const documentReview = sampleData.results['documentation review']

  const rowCount = Math.max(
    ...Object.values(documentReview).map((category) => Object.keys(category).length),
  )

  const metricCount = Object.keys(metricLabelMapping).length

  return (
    <Flex gap="8">
      <Flex
        direction="column"
        width="500px"
        overflowX="auto"
        style={{
          border: '1px solid #00002F26',
          alignSelf: 'self-start',
          borderRadius: 8,
        }}
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
              {Object.entries(categoryValue).map(([subKey, data], subKeyIndex) => {
                return (
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
                )
              })}
            </Flex>
          ))}
        </Flex>
      </Flex>

      <Flex
        direction="column"
        minWidth="185px"
        overflowX="auto"
        style={{
          border: '1px solid #00002F26',
          alignSelf: 'self-start',
          borderRadius: 8,
        }}
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
            {label}
          </Cell>
        ))}
      </Flex>
    </Flex>
  )
}
