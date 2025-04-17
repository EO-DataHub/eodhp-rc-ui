import React, { useState } from 'react'
import { Flex, Text, Select } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import countries from '../../data/countries.json'

interface FieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
}

const Field: React.FC<FieldProps> = ({ label, children, required = false }) => (
  <Flex direction="column" gap="1">
    <Flex className={styles.selection} direction="row" gap="3">
      <Flex>
        <Text weight="bold" size="2">
          {label}
        </Text>
        {required && <span className={styles.asterisk}>*</span>}
      </Flex>
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
    endUserCountry: provider !== 'planet' ? 'GB' : '',
    licence: '',
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
      airbus_sar: ['SSC', 'MGD', 'GEC', 'EEC'],
    },
    licence: {
      airbus_optical: [
        'Standard',
        'Background Layer',
        'Standard + Background Layer',
        'Academic',
        'Media Licence',
        'Standard Multi End-Users (2-5)',
        'Standard Multi End-Users (6-10)',
        'Standard Multi End-Users (11-30)',
        'Standard Multi End-Users (>30)',
      ],
      airbus_sar: [
        'Single User Licence',
        'Multi User (2 - 5) Licence',
        'Multi User (6 - 30) Licence',
      ],
    },
    orbit: ['rapid', 'science'],
    resolutionVariant: ['RE', 'SE'],
    projection: ['Auto', 'UTM', 'UPS'],
  }

  const renderSelect = (field: keyof typeof options, label: string, isDisabled = false) => {
    let items: string[] | undefined

    const isFieldRequired = (field: string) => {
      if (['productBundle', 'licence'].includes(field)) return true
      if (
        provider === 'airbus_sar' &&
        ['orbit', 'resolutionVariant', 'projection'].includes(field)
      ) {
        return true
      }
      return false
    }

    if (field === 'productBundle') {
      items =
        provider === 'airbus_optical' || provider === 'planet'
          ? options.productBundle.shared
          : options.productBundle.airbus_sar
    } else if (field === 'licence') {
      items = options.licence[provider as keyof typeof options.licence]
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
      <Field label={label} required={isFieldRequired(field)}>
        <Select.Root
          size="2"
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
        <Field label="End User Country" required>
          <Select.Root
            size="2"
            value={selectedValues.endUserCountry}
            onValueChange={(value) => handleChange('endUserCountry', value)}
          >
            <Select.Trigger className={styles.selectTrigger} placeholder="Select" />
            <Select.Content className={styles.selectContent}>
              <Select.Group>
                {countries.map((country) => (
                  <Select.Item key={country.id} value={country.id} className={styles.item}>
                    {country.label}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Field>
      )}

      {/* Licence - Required for Airbus */}
      {(provider === 'airbus_optical' || provider === 'airbus_sar') &&
        renderSelect('licence', 'Licence')}

      {/* Orbit - Airbus SAR only */}
      {provider === 'airbus_sar' && renderSelect('orbit', 'Orbit')}

      {/* Resolution Variant - Airbus SAR only */}
      {provider === 'airbus_sar' &&
        renderSelect('resolutionVariant', 'Resolution Variant', isResolutionVariantDisabled)}

      {/* Projection - Airbus SAR only */}
      {provider === 'airbus_sar' && renderSelect('projection', 'Projection', isProjectionDisabled)}
    </Flex>
  )
}
