import { useContext } from 'react'
import { Text, DropdownMenu, Badge } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
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
  const {
    isAuthenticated,
    isAuthenticating,
    isAuthenticationServiceError,
    isHubAdmin,
    login,
    logout,
    workspaceUserName,
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
          {workspaceUserName && (
            <>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text weight="bold">{workspaceUserName}</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item asChild>
                    <Link to="/profile/identity">Identity</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link to="/profile/accounts">Accounts</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link to="/profile/workspaces">Workspaces</Link>
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              <DropdownMenu.Separator />
            </>
          )}

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Workspace settings</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild>
                <Link to="/settings/members">Members</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to="/settings/credentials">Credentials</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to="/settings/provider-accounts">Provider accounts</Link>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Accounting / Billing</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild>
                <Link to="/accounting/credits">Credits</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to="/accounting/usage">Usage</Link>
              </DropdownMenu.Item>
              {isHubAdmin && (
                <DropdownMenu.Item asChild>
                  <Link to="/accounting/hub">All workspaces</Link>
                </DropdownMenu.Item>
              )}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Item disabled>
            Publishing{' '}
            <Badge ml="2" color="gray" variant="soft">
              Soon
            </Badge>
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>My data</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild>
                <Link to="/my-data/purchased">Purchased data</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to="/my-data/workflow-outputs">Workflow outputs</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to="/my-data/data-storage">Files</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to="/my-data/saved-sets">Saved sets</Link>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

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
        <LoadingIndicator light={true} />
      ) : isAuthenticated ? (
        <LogoutMenu />
      ) : (
        <button onClick={login} className={styles.loginButton}>
          Sign in
        </button>
      )}
    </div>
  )
}
