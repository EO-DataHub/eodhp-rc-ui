import React from 'react'
import { Badge, Text } from '@radix-ui/themes'

/**
 * Shows a formatted change: "New" as a badge, and a change that rounds to 0, which has no
 * sign, in grey.
 */
export const ChangeText: React.FC<{ text: string }> = ({ text }) => {
  if (text === 'New') return <Badge color="blue">New</Badge>
  if (!/^[+-]/.test(text)) return <Text color="gray">{text}</Text>
  return <>{text}</>
}
