import React from 'react'
import { Text } from '@radix-ui/themes'
import styles from './FormField.module.scss'

export const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className={styles.formField}>
    <Text size="2" weight="medium" as="label">
      {label}
    </Text>
    {children}
  </div>
)
