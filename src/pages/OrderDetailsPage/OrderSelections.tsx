import React, { useState } from 'react'
import { Flex, Text, Select } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import countries from '../../data/countries.json'
import type { Workspace } from '@/services/workspaceTokenService'

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
  provider: 'planet' | 'airbus_optical' | 'airbus_sar' | 'open-cosmos'
  onSelectionChange: (selectedValues: Record<string, string>) => void
  workspaces: Workspace[]
  selectedWorkspace: string | undefined
  onWorkspaceChange: (workspace: string) => void
  isWorkspacesLoading: boolean
}

export const OrderSelections: React.FC<OrderSelectionsProps> = ({
  provider,
  onSelectionChange,
  workspaces,
  selectedWorkspace,
  onWorkspaceChange,
  isWorkspacesLoading,
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
    provider === 'airbus_sar' && selectedValues.productBundle === 'SSC'

  const isProjectionDisabled =
    provider === 'airbus_sar' &&
    (selectedValues.productBundle === 'SSC' || selectedValues.productBundle === 'MGD')

  return (
    <Flex direction="column" gap="4" className={styles.selectionsContainer}>
      {/* Workspace - Required for all providers */}
      <Field label="Workspace" required>
        <Select.Root
          size="2"
          value={selectedWorkspace}
          onValueChange={onWorkspaceChange}
          disabled={isWorkspacesLoading}
        >
          <Select.Trigger
            className={styles.selectTrigger}
            placeholder={isWorkspacesLoading ? 'Loading workspaces...' : 'Select'}
          />
          <Select.Content className={styles.selectContent}>
            <Select.Group>
              {workspaces?.map((workspace) => (
                <Select.Item key={workspace.id} value={workspace.name}>
                  {workspace.name ?? workspace.id}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Field>
      {/* Product Bundle - Not applicable for OpenCosmos */}
      {provider !== 'open-cosmos' && renderSelect('productBundle', 'Product Bundle')}

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
