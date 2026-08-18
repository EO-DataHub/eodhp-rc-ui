import React, { useContext } from 'react'
import { Badge, Flex, Text } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'

interface PageHeadingProps {
  title: string
  subtitle?: string
  hideWorkspace?: boolean
}

export const PageHeading: React.FC<PageHeadingProps> = ({ title, subtitle, hideWorkspace }) => {
  const { currentWorkspace } = useContext(AuthenticationContext)

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="2">
        <Text size="7" weight="medium">
          {title}
        </Text>
        {!hideWorkspace && currentWorkspace && (
          <Badge size="2" color="gray" variant="soft">
            {currentWorkspace}
          </Badge>
        )}
      </Flex>
      {subtitle && (
        <Text size="3" color="gray">
          {subtitle}
        </Text>
      )}
    </Flex>
  )
}
