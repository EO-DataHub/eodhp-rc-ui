import { Flex, Heading, Link, Popover, Text } from '@radix-ui/themes'
import styles from './DataQualitySection.module.scss'
import React, { PropsWithChildren } from 'react'
import { ExternalLinkIcon, LockClosedIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import {
  Collection,
  CollectionDocumentationQALeaf,
  CollectionDocumentationQAPayload,
} from '@/types'
import { fetchCollectionQAJsonAsset } from '@/services/collectionService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { parseFrameworkReference } from '@/library/collectionQuality'
import { qaDocumentationIntro } from './qaIntroCopy'

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
  calibration_algorithm: 'Calibration Algorithm',
  mission_specific_processing: 'Mission-Specific Processing',
  product_specific_processing: 'Product-Specific Processing',
}

const cellStyle = (hasBorderBottom: boolean, additionalStyle?: React.CSSProperties) => ({
  borderBottom: hasBorderBottom ? '1px solid #00002F26' : undefined,
  ...additionalStyle,
})

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
    style={cellStyle(hasBorderBottom, additionalStyle)}
  >
    {children}
  </div>
)

const getLinkLabel = (link: CollectionDocumentationQALeaf['links'][number]) => {
  if (link.title) return link.title
  const fileName = link.href.split('/').filter(Boolean).pop() ?? link.href
  try {
    return decodeURIComponent(fileName)
  } catch {
    return fileName
  }
}

interface MatrixCellProps {
  label: string
  leaf: CollectionDocumentationQALeaf
  hasBorderBottom: boolean
}

/** A maturity matrix result box. Links to its supporting documents when it has any. */
const MatrixCell: React.FC<MatrixCellProps> = ({ label, leaf, hasBorderBottom }) => {
  const links = leaf.links.filter((link) => link.href)
  const style = cellStyle(hasBorderBottom, {
    backgroundColor: metricColorMapping[leaf.value as keyof typeof metricColorMapping],
  })

  if (links.length === 0) {
    return (
      <div className={`${styles.cell} ${styles.bodyCell}`} style={style}>
        {label}
      </div>
    )
  }

  const className = `${styles.cell} ${styles.bodyCell} ${styles.linkCell}`
  const content = (
    <>
      {label}
      <ExternalLinkIcon className={styles.linkIcon} aria-hidden />
    </>
  )

  if (links.length === 1) {
    return (
      <a
        href={links[0].href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        title={getLinkLabel(links[0])}
      >
        {content}
      </a>
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger>
        <button
          type="button"
          className={className}
          style={style}
          aria-label={`${label}: ${links.length} supporting documents`}
        >
          {content}
        </button>
      </Popover.Trigger>
      <Popover.Content maxWidth="360px" size="1">
        <Text as="p" size="2" weight="medium" mb="2">
          {label}: supporting documents
        </Text>
        <Flex direction="column" gap="2">
          {links.map((link, index) => (
            <Link
              key={`${link.href}-${index}`}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              size="2"
              underline="always"
            >
              {getLinkLabel(link)}
            </Link>
          ))}
        </Flex>
      </Popover.Content>
    </Popover.Root>
  )
}

export const DataQualitySection = ({ collection }: { collection: Collection }) => {
  const documentationHref = collection.assets?.qa_documentation?.href

  const { data: output, isLoading } = useQuery({
    queryKey: ['CollectionDocumentationQA', collection.id, documentationHref],
    queryFn: () => {
      if (!documentationHref) return null
      return fetchCollectionQAJsonAsset<CollectionDocumentationQAPayload>(documentationHref)
    },
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: Boolean(documentationHref),
  })

  if (!documentationHref) {
    return 'Document quality assurance not available for this collection.'
  }

  if (isLoading) {
    return (
      <Flex gap="3" align="center">
        <LoadingIndicator size="3" />
        <Text>Loading data...</Text>
      </Flex>
    )
  }

  if (!output?.qa_check_results) {
    return 'Document quality assurance not available for this collection.'
  }

  const { links: reportLinks, ...categories } = output.qa_check_results
  const reportLink = reportLinks?.[0]
  const frameworkReference = parseFrameworkReference(output.information)

  const rowCount = Math.max(
    ...Object.values(categories).map((category) => Object.keys(category).length),
  )

  const metricCount = Object.keys(metricLabelMapping).length

  return (
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="2" maxWidth="700px">
        <Text as="p">{qaDocumentationIntro}</Text>
        {frameworkReference && (
          <Text as="p">
            <Link
              href={frameworkReference.href}
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
            >
              {frameworkReference.label}
            </Link>
          </Text>
        )}
      </Flex>

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
              {Object.entries(categories).map(([categoryKey, categoryValue]) => (
                <Flex direction="column" flexGrow="1" flexBasis="0" key={categoryKey}>
                  <Cell
                    className={styles.headerCell}
                    style={{
                      height: 100,
                    }}
                  >
                    {labelMapping[categoryKey] || categoryKey}
                  </Cell>
                  {Object.keys(categoryValue).map((subKey, subKeyIndex) => (
                    <MatrixCell
                      key={subKey}
                      label={labelMapping[subKey] || subKey}
                      leaf={categoryValue[subKey]}
                      hasBorderBottom={subKeyIndex < rowCount - 1}
                    />
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

      {reportLink?.href && (
        <Flex direction="column" align="start">
          <Heading as="h3" size="4" mb="2" weight="medium">
            Full Report
          </Heading>
          <Link
            href={reportLink.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            weight="medium"
          >
            {reportLink.title ?? 'View Full Report'}
          </Link>
        </Flex>
      )}
    </Flex>
  )
}
