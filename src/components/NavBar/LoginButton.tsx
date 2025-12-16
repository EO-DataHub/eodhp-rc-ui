import { useContext } from 'react'
import { Text, DropdownMenu } from '@radix-ui/themes'
import { AuthenticationContext } from '../../context/AuthenticationContext'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import styles from './LoginButton.module.scss'
import { PersonIcon, ExitIcon } from '@radix-ui/react-icons'
import SettingsIcon from '@material-design-icons/svg/filled/settings.svg?react'

export const LoginButton = ({
  isUserMenuOpen,
  setIsUserMenuOpen,
}: {
  isUserMenuOpen: boolean
  setIsUserMenuOpen: (isOpen: boolean) => void
}) => {
  const {
    isAuthenticated,
    isAuthenticating,
    isAuthenticationServiceError,
    login,
    logout,
    availableWorkspaces,
    setShowWorkspaceModal,
  } = useContext(AuthenticationContext)

  if (isAuthenticationServiceError) {
    const errorText =
      'Account services including logging in are not available right now. To try again later, click the browser refresh button.'

    return (
      <div className={`${styles.loginButton}`} title={errorText}>
        <div className={styles.errorText}>{errorText}</div>
      </div>
    )
  }

  const LogoutMenu = () => {
    return (
      <DropdownMenu.Root onOpenChange={setIsUserMenuOpen} open={isUserMenuOpen}>
        <DropdownMenu.Trigger>
          <div className={styles.userMenuButton}>
            <PersonIcon />
          </div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content className={styles.dropdownContent}>
          {isAuthenticated && !isAuthenticating ? (
            <>
              {availableWorkspaces.length > 0 && (
                <DropdownMenu.Item
                  asChild
                  onSelect={() => {
                    setShowWorkspaceModal(true)
                    setIsUserMenuOpen(false)
                  }}
                  // temp workaround: using type assertion to bypass TS error about missing 'children' property on dropdown menu item
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {...({} as any)}
                  className={styles.logoutButton}
                >
                  <div>
                    <Text className={styles.logoutText}>Change Workspace</Text>{' '}
                    <SettingsIcon className={styles.icon} />
                  </div>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item
                asChild
                onSelect={logout}
                // temp workaround: using type assertion to bypass TS error about missing 'children' property on dropdown menu item
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({} as any)}
                className={styles.logoutButton}
              >
                <div>
                  <Text className={styles.logoutText}>Log out</Text>{' '}
                  <ExitIcon className={styles.icon} />
                </div>
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  return (
    <div>
      {isAuthenticating ? (
        <LoadingIndicator light={true} />
      ) : isAuthenticated ? (
        <LogoutMenu />
      ) : (
        <button onClick={login} className={styles.loginButton}>
          Log in
        </button>
      )}
    </div>
  )
}
