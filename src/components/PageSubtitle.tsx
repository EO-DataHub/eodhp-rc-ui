import { ReactNode } from 'react'
import { Text } from '@radix-ui/themes'

export const PageSubtitle = ({ children }: { children: ReactNode }) => {
  return (
    <Text weight="bold" as="p">
      {children}
    </Text>
  )
}
