import React, { useState } from 'react'
import { Flex, Link, Text } from '@radix-ui/themes'
import { LoginButton } from './LoginButton'
import MapsIcon from '@/assets/icons/maps-icon.svg?react'
import AppsIcon from '@/assets/icons/apps-icon.svg?react'
import { useLocation } from 'react-router-dom'

import EarthObservationDataHubLogo from '@/assets/icons/eo-data-hub-logo.svg?react'
import styles from './NavBar.module.scss'

export const NavBar: React.FC = () => {
  const location = useLocation()
  const isCatalogActive = location.pathname === '/'
  const isMapsActive = location.pathname.startsWith('/finder')
  const [isUserMenuOpen, setUserIsMenuOpen] = useState(false)

  return (
    <Flex px="5" py="3" align="center" justify="between" className={styles.container}>
      <Link href="/" className={styles.logo}>
        <EarthObservationDataHubLogo />
      </Link>
      <Flex gap="5" className={styles.navLinks}>
        <Flex gap="1" align="center">
          <Link href="/" className={`${styles.link} ${isCatalogActive ? styles.active : ''}`}>
            <Flex gap="3" align="center" px="4" py="2">
              <AppsIcon className={styles.icon} />
              <Text className={styles.text}>Catalogue</Text>
            </Flex>
          </Link>
          <Link
            href="/finder/sentinel2_ard"
            className={`${styles.link} ${isMapsActive ? styles.active : ''}`}
          >
            <Flex gap="3" align="center" px="4" py="2">
              <MapsIcon className={styles.icon} />
              <Text className={styles.text}>Maps</Text>
            </Flex>
          </Link>
        </Flex>

        <LoginButton isUserMenuOpen={isUserMenuOpen} setIsUserMenuOpen={setUserIsMenuOpen} />
      </Flex>
    </Flex>
  )
}
