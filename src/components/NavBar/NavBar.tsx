import React, { useState, useContext, useRef, useEffect } from 'react'
import { Flex } from '@radix-ui/themes'
import { LoginButton } from './LoginButton'
import ArrowIcon from '@/assets/icons/arrow-down.svg?react'
import { useLocation, Link } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { ChangeWorkspaceModal } from '@/components/ChangeWorkspaceModal/ChangeWorkspaceModal'

import EarthObservationDataHubLogo from '@/assets/icons/eo-data-hub-logo.svg?react'
import styles from './NavBar.module.scss'

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

interface DropdownMenuProps {
  label: string
  shouldOpen: boolean
  renderMenuItem: () => React.ReactNode
  onClick: () => void
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  label,
  shouldOpen,
  renderMenuItem,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClick()
      }
    }

    if (shouldOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [shouldOpen, onClick])

  return (
    <div ref={ref} className={`${styles.menu__item} ${shouldOpen ? styles.open : ''}`}>
      <div className={styles.dropdown__toggle} onClick={onClick}>
        {label} <ArrowIcon className={styles.arrow} />
      </div>
      {shouldOpen && <div className={styles.dropdown__menu}>{renderMenuItem()}</div>}
    </div>
  )
}

export const NavBar: React.FC = () => {
  const location = useLocation()
  const isCatalogActive = location.pathname === '/'
  const isMapsActive = location.pathname.startsWith('/finder')
  const isMyDataActive = location.pathname.startsWith('/my-data')
  const isProcessesCatalogueActive = location.pathname.startsWith('/catalogue/processes')
  const { isAuthenticated, currentWorkspace } = useContext(AuthenticationContext)
  const [isUserMenuOpen, setUserIsMenuOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isChangeWorkspaceModalOpen, setIsChangeWorkspaceModalOpen] = useState(false)

  const toggleMenu = (menuName: string | null) => {
    if (!menuName) {
      setOpenMenu(null)
    }

    setOpenMenu((prev) => (prev === menuName ? null : menuName))
  }

  useEffect(() => {
    if (location.pathname) {
      toggleMenu(null)
    }
  }, [location.pathname])

  const workspaceHref = currentWorkspace
    ? `${HUB_BASE_URL}/workspaces/?workspace=${encodeURIComponent(currentWorkspace)}`
    : `${HUB_BASE_URL}/workspaces/`

  return (
    <>
      <Flex px="6" py="2" align="center" justify="between" className={styles.container}>
        <Flex className={styles.navLinks} width="50%">
          <a href={`${HUB_BASE_URL}/`} className={styles.logo}>
            <EarthObservationDataHubLogo style={{ width: '162px', height: '60px' }} />
          </a>

          <DropdownMenu
            label="About"
            shouldOpen={openMenu === 'about'}
            onClick={() => toggleMenu('about')}
            renderMenuItem={() => (
              <>
                <a href={`${HUB_BASE_URL}/about/hub`}>Earth Observation Data Hub</a>
                <a href={`${HUB_BASE_URL}/about/applications`}>Access Points</a>
              </>
            )}
          />

          <DropdownMenu
            label="Data"
            shouldOpen={openMenu === 'data'}
            onClick={() => toggleMenu('data')}
            renderMenuItem={() => (
              <>
                <a href={`${HUB_BASE_URL}/data/open-access`}>Open Access</a>
                <a href={`${HUB_BASE_URL}/data/commercial`}>Commercial</a>
                <a href={`${HUB_BASE_URL}/data/quality-assurance`}>Quality Assurance</a>
              </>
            )}
          />

          <DropdownMenu
            label="Getting Started"
            shouldOpen={openMenu === 'getting-started'}
            onClick={() => toggleMenu('getting-started')}
            renderMenuItem={() => (
              <>
                <a href={`${HUB_BASE_URL}/case-studies`}>Case Studies</a>
                <a href={`${HUB_BASE_URL}/docs/account-setup`}>Account Setup</a>
                <a href={`${HUB_BASE_URL}/docs/faqs`}>FAQs</a>
                <a href={`${HUB_BASE_URL}/docs/documentation`}>Documentation</a>
              </>
            )}
          />
        </Flex>
        <Flex gap="5" className={styles.navLinks}>
          <a href="https://eodatahub-workspaces.org.uk/notebooks" className={styles.parentLink}>
            Notebooks
          </a>
          <DropdownMenu
            label="Catalogue"
            shouldOpen={openMenu === 'catalogue'}
            onClick={() => toggleMenu('catalogue')}
            renderMenuItem={() => (
              <>
                <Link to="/" className={`${styles.link} ${isCatalogActive ? styles.active : ''}`}>
                  Browse
                </Link>

                <Link
                  to="/finder/sentinel2_ard"
                  className={`${styles.link} ${isMapsActive ? styles.active : ''}`}
                >
                  Maps
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/my-data/purchased"
                    className={`${styles.link} ${isMyDataActive ? styles.active : ''}`}
                  >
                    My Data
                  </Link>
                )}
                <Link
                  to="/catalogue/processes"
                  className={`${styles.link} ${isProcessesCatalogueActive ? styles.active : ''}`}
                >
                  Processes
                </Link>
              </>
            )}
          />

          <DropdownMenu
            label="Workspaces"
            shouldOpen={openMenu === 'workspaces'}
            onClick={() => toggleMenu('workspaces')}
            renderMenuItem={() => (
              <>
                {isAuthenticated && (
                  <button
                    type="button"
                    aria-label="Change current workspace"
                    onClick={() => {
                      setIsChangeWorkspaceModalOpen(true)
                      toggleMenu(null)
                    }}
                  >
                    Change Workspace
                  </button>
                )}
                <a href={workspaceHref} onClick={() => toggleMenu(null)}>
                  View Workspace
                </a>
              </>
            )}
          />
          <LoginButton isUserMenuOpen={isUserMenuOpen} setIsUserMenuOpen={setUserIsMenuOpen} />
        </Flex>
      </Flex>
      <ChangeWorkspaceModal
        isOpen={isChangeWorkspaceModalOpen}
        onClose={() => setIsChangeWorkspaceModalOpen(false)}
      />
    </>
  )
}
