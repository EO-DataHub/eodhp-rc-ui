import React, { useState } from 'react'
import { Flex, Text, Select } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import countries from '../../data/countries.json'

interface FieldProps {
  label: string
  children: React.ReactNode
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <Flex direction="column" gap="1">
    <Flex className={styles.selection} direction="row" gap="3">
      <Text weight="bold">{label}</Text>
      <InfoCircledIcon />
    </Flex>
    <Flex>{children}</Flex>
  </Flex>
)

interface OrderSelectionsProps {
  provider: 'planet' | 'airbus_optical' | 'airbus_sar'
  onSelectionChange: (selectedValues: Record<string, string>) => void
}

export const OrderSelections: React.FC<OrderSelectionsProps> = ({
  provider,
  onSelectionChange,
}) => {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({
    productBundle: '',
    country: provider !== 'planet' ? 'GB' : '',
    license: '',
    orbit: '',
    resolutionVariant: '',
    projection: '',
  })

  const handleChange = (field: string, value: string) => {
    const updatedValues = { ...selectedValues, [field]: value }
    setSelectedValues(updatedValues)
    onSelectionChange(updatedValues)
  }

  const options = {
    productBundle: {
      shared: ['Visual', 'General Use', 'Basic', 'Analytic'],
      airbus_sar: [
        'SSC (Single Look Slant Range Complex)',
        'MGD (Multilook Ground Range Detected)',
        'GEC (Geocoded Ellipsoid Corrected)',
        'EEC (Enhanced Ellipsoid Corrected)',
      ],
    },
    license: {
      airbus_optical: [
        'Standard',
        'Background Layer',
        'Standard + Background Layer',
        'Academic',
        'Media License',
        'Standard Multi End-Users (2-5)',
        'Standard Multi End-Users (6-10)',
        'Standard Multi End-Users (11-30)',
        'Standard Multi End-Users (+30)',
      ],
      airbus_sar: ['Single User', 'Multi User (2-5)', 'Multi User (6-30)'],
    },
    orbit: ['Rapid (Standard)', 'Science (Higher Precision)'],
    resolutionVariant: ['Radiometrically Enhanced', 'Spatially Enhanced'],
    projection: ['Auto', 'UTM (Standard)', 'UPS (Polar)'],
  }

  const renderSelect = (field: keyof typeof options, label: string, isDisabled = false) => {
    let items: string[] | undefined

    if (field === 'productBundle') {
      items =
        provider === 'airbus_optical' || provider === 'planet'
          ? options.productBundle.shared
          : options.productBundle.airbus_sar
    } else if (field === 'license') {
      items = options.license[provider as keyof typeof options.license]
    } else if (field === 'orbit') {
      items = options.orbit
    } else if (field === 'resolutionVariant') {
      items = options.resolutionVariant
    } else if (field === 'projection') {
      items = options.projection
    } else {
      return null
    }

    if (!items) return null

    return (
      <Field label={label}>
        <Select.Root
          size="3"
          value={selectedValues[field]}
          onValueChange={(value) => handleChange(field, value)}
          disabled={isDisabled}
        >
          <Select.Trigger className={styles.selectTrigger} placeholder="Select" />
          <Select.Content className={styles.selectContent}>
            <Select.Group>
              {items.map((label) => (
                <Select.Item key={label} value={label}>
                  {label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Field>
    )
  }

  const isResolutionVariantDisabled =
    provider === 'airbus_sar' &&
    selectedValues.productBundle === 'SSC (Single Look Slant Range Complex)'

  const isProjectionDisabled =
    provider === 'airbus_sar' &&
    (selectedValues.productBundle === 'SSC (Single Look Slant Range Complex)' ||
      selectedValues.productBundle === 'MGD (Multilook Ground Range Detected)')

  return (
    <Flex direction="column" gap="4" className={styles.selectionsContainer}>
      {/* Product Bundle - Required for all providers */}
      {renderSelect('productBundle', 'Product Bundle')}

      {/* End User Country - Required for Airbus */}
      {(provider === 'airbus_optical' || provider === 'airbus_sar') && (
        <Field label="End User Country">
          <Select.Root
            size="3"
            value={selectedValues.country}
            onValueChange={(value) => handleChange('country', value)}
          >
            <Select.Trigger className={styles.selectTrigger} placeholder="Select" />
            <Select.Content className={styles.selectContent}>
              <Select.Group>
                {countries.map((country) => (
                  <Select.Item key={country.code} value={country.code} className={styles.item}>
                    {country.name}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Field>
      )}

      {/* License - Required for Airbus */}
      {(provider === 'airbus_optical' || provider === 'airbus_sar') &&
        renderSelect('license', 'License')}

      {/* Orbit - Airbus SAR only */}
      {provider === 'airbus_sar' && renderSelect('orbit', 'Orbit')}

      {/* Resolution Variant - Airbus Optical only */}
      {provider === 'airbus_optical' &&
        renderSelect('resolutionVariant', 'Resolution Variant', isResolutionVariantDisabled)}

      {/* Projection - Airbus Optical only */}
      {provider === 'airbus_optical' &&
        renderSelect('projection', 'Projection', isProjectionDisabled)}
    </Flex>
  )
}
