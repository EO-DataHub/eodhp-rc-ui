import React, { useContext } from 'react'
import { Badge, Flex, Text } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'

interface PageHeadingProps {
  title: string
  subtitle?: string
  badge?: 'workspace' | 'user' | 'none'
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  subtitle,
  badge = 'workspace',
}) => {
  const { currentWorkspace, workspaceUserName } = useContext(AuthenticationContext)
  const badgeText =
    badge === 'workspace' ? currentWorkspace : badge === 'user' ? workspaceUserName : undefined

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="2">
        <Text size="7" weight="medium">
          {title}
        </Text>
        {badgeText && (
          <Badge size="2" color="gray" variant="soft">
            {badgeText}
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
