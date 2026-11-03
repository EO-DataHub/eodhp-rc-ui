import React, { ReactNode, useContext } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'

// Renders its children for hub admins only, so nothing beneath it sends a request otherwise.
export const HubAdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isHubAdmin } = useContext(AuthenticationContext)

  if (!isHubAdmin) {
    return (
      <Flex direction="column" gap="2" p="4">
        <Text size="5" weight="medium">
          Hub admins only
        </Text>
        <Text color="gray">You need the hub admin role to see usage across all workspaces.</Text>
      </Flex>
    )
  }

  return <>{children}</>
}
