import { useContext } from 'react'
import { Text, DropdownMenu } from '@radix-ui/themes'
import { AuthenticationContext } from '../../context/AuthenticationContext'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import styles from './LoginButton.module.scss'
import { PersonIcon, ExitIcon } from '@radix-ui/react-icons'

export const LoginButton = ({
  isUserMenuOpen,
  setIsUserMenuOpen,
}: {
  isUserMenuOpen: boolean
  setIsUserMenuOpen: (isOpen: boolean) => void
}) => {
  const { isAuthenticated, isAuthenticating, isAuthenticationServiceError, login, logout } =
    useContext(AuthenticationContext)

  if (isAuthenticationServiceError) {
    const errorText =
      'Account services including logging in are not available right now. To try again later, click the browser refresh button.'

    return (
      <Text className={`${styles.button} ${styles.errorText}`} title={errorText}>
        {errorText}
      </Text>
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
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  return (
    <div>
      {isAuthenticating ? (
        <LoadingIndicator />
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
