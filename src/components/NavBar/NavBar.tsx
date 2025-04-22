import React, { useState, useContext } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { LoginButton } from './LoginButton'
import MapsIcon from '@/assets/icons/maps-icon.svg?react'
import FolderIcon from '@/assets/icons/folder-filled.svg?react'
import AppsIcon from '@/assets/icons/apps-icon.svg?react'
import ArrowIcon from '@/assets/icons/arrow-down.svg?react'
import { useLocation, Link } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'

import EarthObservationDataHubLogo from '@/assets/icons/eo-data-hub-logo.svg?react'
import styles from './NavBar.module.scss'

export const NavBar: React.FC = () => {
  const location = useLocation()
  const isCatalogActive = location.pathname === '/'
  const isMapsActive = location.pathname.startsWith('/finder')
  const { isAuthenticated } = useContext(AuthenticationContext)
  const [isUserMenuOpen, setUserIsMenuOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const toggleMenu = (menuName: string) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName))
  }

  return (
    <Flex px="5" py="3" align="center" justify="between" className={styles.container}>
      <Flex gap="5" className={styles.navLinks}>
        <Link to="/" className={styles.logo}>
          <EarthObservationDataHubLogo style={{ width: '150px', height: 'auto' }} />
        </Link>
        <div className={`${styles.menu__item} ${openMenu === 'about' ? styles.open : ''}`}>
          <div className={styles.dropdown__toggle} onClick={() => toggleMenu('about')}>
            About <ArrowIcon className={styles.arrow} />
          </div>
          {openMenu === 'about' && (
            <div className={styles.dropdown__menu}>
              <a href="https://staging.eodatahub.org.uk/about/hub">Earth Observation Data Hub</a>
              <a href="https://staging.eodatahub.org.uk/about/applications">Access Points</a>
            </div>
          )}
        </div>
        <div className={`${styles.menu__item} ${openMenu === 'data' ? styles.open : ''}`}>
          <div className={styles.dropdown__toggle} onClick={() => toggleMenu('data')}>
            Data <ArrowIcon className={styles.arrow} />
          </div>
          {openMenu === 'data' && (
            <div className={styles.dropdown__menu}>
              <a href="https://staging.eodatahub.org.uk/data/open-access">Open Access</a>
              <a href="https://staging.eodatahub.org.uk/data/commercial">Commercial</a>
              <a href="https://staging.eodatahub.org.uk/data/quality-assurance">
                Quality Assurance
              </a>
            </div>
          )}
        </div>
        <div
          className={`${styles.menu__item} ${openMenu === 'getting-started' ? styles.open : ''}`}
        >
          <div className={styles.dropdown__toggle} onClick={() => toggleMenu('getting-started')}>
            Getting Started <ArrowIcon className={styles.arrow} />
          </div>
          {openMenu === 'getting-started' && (
            <div className={styles.dropdown__menu}>
              <a href="https://staging.eodatahub.org.uk/case-studies">Case Studies</a>
              <a href="https://staging.eodatahub.org.uk/docs/account-setup">Account Setup</a>
              <a href="https://staging.eodatahub.org.uk/docs/faqs">FAQs</a>
              <a href="https://staging.eodatahub.org.uk/docs/documentation">Documentation</a>
            </div>
          )}
        </div>
      </Flex>
      <Flex gap="5" className={styles.navLinks}>
        <Flex gap="1" align="center">
          <Link to="/" className={`${styles.link} ${isCatalogActive ? styles.active : ''}`}>
            <Flex gap="3" align="center" px="4" py="2">
              <AppsIcon className={styles.icon} />
              <Text className={styles.text}>Catalogue</Text>
            </Flex>
          </Link>
          <Link
            to="/finder/sentinel2_ard"
            className={`${styles.link} ${isMapsActive ? styles.active : ''}`}
          >
            <Flex gap="3" align="center" px="4" py="2">
              <MapsIcon className={styles.icon} />
              <Text className={styles.text}>Maps</Text>
            </Flex>
          </Link>
          {isAuthenticated && (
            <Link to="/my-data/" className={styles.link}>
              <Flex gap="3" align="center" px="4" py="2">
                <FolderIcon className={styles.icon} />
                <Text className={styles.text}>My Data</Text>
              </Flex>
            </Link>
          )}
        </Flex>

        <LoginButton isUserMenuOpen={isUserMenuOpen} setIsUserMenuOpen={setUserIsMenuOpen} />
      </Flex>
    </Flex>
  )
}
