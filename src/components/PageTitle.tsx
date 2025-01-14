import { Heading } from '@radix-ui/themes'
import { ReactNode } from 'react'

export const PageTitle = ({ children }: { children: ReactNode }) => {
  return (
    <Heading as="h1" size="7">
      {children}
    </Heading>
  )
}
