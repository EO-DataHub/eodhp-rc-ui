// Introductory copy for the QA tabs, supplied by NPL (see EO-DataHub/user-journeys#40).
import { Link, Text } from '@radix-ui/themes'
import { PropsWithChildren } from 'react'

const ExternalLink = ({ href, children }: PropsWithChildren<{ href: string }>) => (
  <Link href={href} target="_blank" rel="noopener noreferrer" underline="always">
    {children}
  </Link>
)

export const QADocumentationIntro = () => (
  <>
    <Text as="p">
      This product Quality Processes Review (QPR) has been prepared by the EO DataHub QA Service
      following the established international{' '}
      <ExternalLink href="https://science.nasa.gov/wp-content/uploads/2026/05/joint-optical-guidelines-jul2025-signed.pdf">
        ESA/NASA/USGS EO Product QA framework
      </ExternalLink>
      . This is aimed at demonstrating that the product has been developed and generated following
      processes that adhere to best practices.
    </Text>
    <Text as="p">
      The results are summarised in a maturity matrix, which reports on different aspects of product
      quality following a colour-coded grading scale. Click on a box to see the documentation that
      supports each result, or click the link below to read the full QPR report.
    </Text>
  </>
)

export const QAValidationIntro = () => (
  <>
    <Text as="p">
      These results report product performance validation, to demonstrate the data is performing
      within its specification.
    </Text>
    <Text as="p">
      The EODH QA Service is developing a suite of Validation Workflows to test different aspects of
      the data product specification, with the initial implementation for radiometric uncertainty.
      The developed validation methodology used is described in the Validation Workflow Description
      (VWD) document linked below.
    </Text>
    <Text as="p">
      Validation results are reported as pass/partial/fail compliance with respect to the providers
      claimed performance. Click the metric links to view the data product&apos;s documentation
      outlining their claimed specification. Additionally, click the overall result Status to see
      the data behind the results visually displayed on the{' '}
      <ExternalLink href="https://www.ceos-pvp.org/">CEOS-PVP RadVAL dashboard</ExternalLink>.
    </Text>
  </>
)
