import React, { useState, useContext, useRef, useEffect } from 'react'
import { Flex, Select } from '@radix-ui/themes'
import { LoginButton } from './LoginButton'
import { Cross1Icon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import ArrowIcon from '@/assets/icons/arrow-down.svg?react'
import { useLocation, Link } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useWorkspaces } from '@/hooks/useWorkspaces'

import EarthObservationDataHubLogo from '@/assets/icons/eo-data-hub-logo.svg?react'
import styles from './NavBar.module.scss'

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

interface DropdownMenuProps {
  id: string
  label: string
  labelTo?: string
  labelHref?: string
  shouldOpen: boolean
  renderMenuItem: () => React.ReactNode
  onClick: () => void
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  id,
  label,
  labelTo,
  labelHref,
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClick()
      }
    }

    if (shouldOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shouldOpen, onClick])

  return (
    <div ref={ref} className={`${styles.menu__item} ${shouldOpen ? styles.open : ''}`}>
      <button
        type="button"
        className={styles.dropdown__toggle}
        aria-expanded={shouldOpen}
        aria-controls={id}
        onClick={onClick}
      >
        <span className={styles.dropdown__label}>{label}</span>
        <ArrowIcon className={styles.arrow} aria-hidden={true} />
      </button>
      {shouldOpen && (
        <div className={styles.dropdown__menu} id={id}>
          {labelHref && (
            <a className={styles.dropdown__parentLink} href={labelHref}>
              {label}
            </a>
          )}
          {labelTo && (
            <Link className={styles.dropdown__parentLink} to={labelTo}>
              {label}
            </Link>
          )}
          {renderMenuItem()}
        </div>
      )}
    </div>
  )
}

export const NavBar: React.FC = () => {
  const location = useLocation()
  const isCatalogActive = location.pathname === '/'
  const isMapsActive = location.pathname.startsWith('/finder')
  const isProcessesCatalogueActive = location.pathname.startsWith('/catalogue/processes')
  const { isAuthenticated, currentWorkspace, updateCurrentWorkspace, token, userInfo } =
    useContext(AuthenticationContext)
  const [isUserMenuOpen, setUserIsMenuOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const { data: workspacesData } = useWorkspaces(token, userInfo?.sub, isAuthenticated)

  const toggleMenu = (menuName: string | null) => {
    if (!menuName) {
      setOpenMenu(null)
    }

    setOpenMenu((prev) => (prev === menuName ? null : menuName))
  }

  useEffect(() => {
    if (location.pathname) {
      toggleMenu(null)
      setIsMobileMenuOpen(false)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Let Escape close an open dropdown or Radix popup first, rather than the whole panel
      if (event.key !== 'Escape' || event.defaultPrevented || openMenu) return
      setIsMobileMenuOpen(false)
      mobileMenuToggleRef.current?.focus()
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Element
      if (mobileMenuRef.current?.contains(target)) return
      if (mobileMenuToggleRef.current?.contains(target)) return
      // The workspace select and user menu render their popups in a portal outside the panel
      if (target.closest('[data-radix-popper-content-wrapper]')) return
      setIsMobileMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [isMobileMenuOpen, openMenu])

  // Route changes close the panel, but a link to the current page doesn't change the route
  const handleMobileMenuClick = (event: React.MouseEvent) => {
    if ((event.target as Element).closest('a')) {
      setOpenMenu(null)
      setIsMobileMenuOpen(false)
    }
  }

  const workspaceHref = currentWorkspace
    ? `${HUB_BASE_URL}/workspaces/?workspace=${encodeURIComponent(currentWorkspace)}`
    : `${HUB_BASE_URL}/workspaces/`

  return (
    <Flex px="6" py="2" align="center" justify="between" className={styles.container}>
      <a href={`${HUB_BASE_URL}/`} className={styles.logo}>
        <EarthObservationDataHubLogo style={{ width: '162px', height: '60px' }} />
      </a>

      {/* Narrow screens collapse every link into a single menu, like the main hub website */}
      <button
        ref={mobileMenuToggleRef}
        type="button"
        className={styles.mobileMenuToggle}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileMenuOpen}
        aria-controls="nav-menu"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        {isMobileMenuOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
      </button>

      <div
        ref={mobileMenuRef}
        id="nav-menu"
        className={`${styles.menuPanel} ${isMobileMenuOpen ? styles.menuPanelOpen : ''}`}
        onClick={handleMobileMenuClick}
      >
        <Flex className={styles.navLinks}>
          <DropdownMenu
            id="about-menu"
            label="About"
            labelHref={`${HUB_BASE_URL}/about`}
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
            id="data-menu"
            label="Data"
            labelHref={`${HUB_BASE_URL}/data`}
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
            id="getting-started-menu"
            label="Getting Started"
            labelHref={`${HUB_BASE_URL}/docs`}
            shouldOpen={openMenu === 'getting-started'}
            onClick={() => toggleMenu('getting-started')}
            renderMenuItem={() => (
              <>
                <a href={`${HUB_BASE_URL}/case-studies`}>Case Studies</a>
                <a href="https://docs.eodatahub.org.uk/">Documentation</a>
              </>
            )}
          />
        </Flex>
        <Flex gap="5" className={styles.navLinks}>
          <a href="https://eodatahub-workspaces.org.uk/notebooks" className={styles.parentLink}>
            Notebooks
          </a>
          <DropdownMenu
            id="catalogue-menu"
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
            id="workspaces-menu"
            label="Workspaces"
            shouldOpen={openMenu === 'workspaces'}
            onClick={() => toggleMenu('workspaces')}
            renderMenuItem={() => (
              <a href={workspaceHref} onClick={() => toggleMenu(null)}>
                View Workspace
              </a>
            )}
          />

          {isAuthenticated && (workspacesData?.length ?? 0) > 0 && (
            <Select.Root
              size="2"
              value={currentWorkspace ?? undefined}
              onValueChange={(workspace) => updateCurrentWorkspace?.(workspace)}
            >
              <Select.Trigger placeholder="Workspace" variant="soft" color="gray" />
              <Select.Content position="popper" variant="soft" color="gray">
                <Select.Group>
                  {workspacesData?.map((workspace) => (
                    <Select.Item key={workspace.id} value={workspace.name}>
                      {workspace.name ?? workspace.id}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          )}
          <LoginButton isUserMenuOpen={isUserMenuOpen} setIsUserMenuOpen={setUserIsMenuOpen} />
        </Flex>
      </div>
    </Flex>
  )
}
