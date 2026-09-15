import React, { useContext } from 'react'
import { Button, Flex, Text } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from '../ProfilePage/ProfilePage.module.scss'

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM
const KEYCLOAK_ACCOUNT_BASE_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/account`
const KEYCLOAK_LINKED_ACCOUNTS_URL = `${KEYCLOAK_ACCOUNT_BASE_URL}/account-security/linked-accounts`

export const IdentityPage: React.FC = () => {
  const { userInfo } = useContext(AuthenticationContext)

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <PageHeading title="Identity" subtitle="Your EODH sign-in details" badge="user" />

      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2">
          <Flex className={styles.identityRow}>
            <Text size="2" weight="medium">
              Name:
            </Text>
            <Text size="2">{userInfo?.name ?? '—'}</Text>
          </Flex>
          <Flex className={styles.identityRow}>
            <Text size="2" weight="medium">
              Username:
            </Text>
            <Text size="2">{userInfo?.preferred_username ?? '—'}</Text>
          </Flex>
          <Flex className={styles.identityRow}>
            <Text size="2" weight="medium">
              Email:
            </Text>
            <Text size="2">{userInfo?.email ?? '—'}</Text>
          </Flex>
        </Flex>
        <Flex gap="3">
          <Button asChild variant="soft" size="2">
            <a href={KEYCLOAK_ACCOUNT_BASE_URL} target="_blank" rel="noreferrer">
              Edit details
            </a>
          </Button>
          <Button asChild variant="soft" size="2">
            <a href={KEYCLOAK_LINKED_ACCOUNTS_URL} target="_blank" rel="noreferrer">
              Manage linked accounts
            </a>
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
