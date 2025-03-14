import React from 'react'
import { Flex, Text, TextField, Select } from '@radix-ui/themes'
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
  isOptical: boolean
}

export const OrderSelections: React.FC<OrderSelectionsProps> = ({ isOptical }) => {
  return (
    <Flex direction="column" gap="4" className={styles.selectionsContainer}>
      {isOptical ? (
        <>
          <Field label="Product ID">
            <TextField.Root className={styles.selectTrigger} placeholder="Enter ID" />
          </Field>

          <Field label="Product Bundle">
            <Select.Root size="3">
              <Select.Trigger className={styles.selectTrigger} placeholder="Select" />
              <Select.Content className={styles.selectContent}>
                <Select.Group>
                  <Select.Item value="analytic">Analytic</Select.Item>
                  <Select.Item value="basic">Basic</Select.Item>
                  <Select.Item value="general">General</Select.Item>
                  <Select.Item value="visual">Visual</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Field>
        </>
      ) : null}

      <Field label="End User Country">
        <Select.Root size="3" defaultValue="GB">
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

      <Field label="License">
        <Select.Root size="3">
          <Select.Trigger className={styles.selectTrigger} placeholder="Select" />
          <Select.Content className={styles.selectContent}>
            <Select.Group>
              <Select.Item value="single use">Single Use</Select.Item>
              <Select.Item value="multi use">Multi Use</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Field>
    </Flex>
  )
}
