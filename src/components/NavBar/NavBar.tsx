import React from 'react'
import { Flex, Link, Text } from '@radix-ui/themes'
import { LoginButton } from './LoginButton'
import MapsIcon from '../../../public/maps-icon.svg?react'
import AppsIcon from '../../../public/apps-icon.svg?react'
import { useLocation } from 'react-router-dom'

import EarthObservationDataHubLogo from '../../../public/eo-data-hub-logo.svg?react'
import styles from './NavBar.module.scss'

export const NavBar: React.FC = () => {
  const location = useLocation()

  const isCatalogActive = location.pathname === '/'
  const isMapsActive = location.pathname === '/finder'

  return (
    <Flex p="3" align="center" justify="between" className={styles.container}>
      <Link href="/">
        <EarthObservationDataHubLogo className={styles.logo} />
      </Link>
      <Flex gap="6">
        <Link href="/" className={`${styles.link} ${isCatalogActive ? styles.active : ''}`}>
          <Flex gap="2" className={styles.flex}>
            <AppsIcon className={styles.icon} />
            <Text className={styles.text}>Catalogue</Text>
          </Flex>
        </Link>

        <Link href="/finder" className={`${styles.link} ${isMapsActive ? styles.active : ''}`}>
          <Flex gap="2" className={styles.flex}>
            <MapsIcon className={styles.icon} />
            <Text className={styles.text}>Maps</Text>
          </Flex>
        </Link>

        <LoginButton />
      </Flex>
    </Flex>
  )
}
