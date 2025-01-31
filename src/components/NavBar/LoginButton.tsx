import { useContext } from 'react'
import { AuthenticationContext } from '../../context/AuthenticationContext'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import styles from './LoginButton.module.scss'

export const LoginButton = () => {
  const { isAuthenticated, isAuthenticating, isAuthenticationServiceError, login, logout } =
    useContext(AuthenticationContext)

  return (
    <div className={styles.button}>
      {isAuthenticationServiceError ? (
        <div>
          Account services including logging in are not available right now. To try again later,
          click the browser refresh button.
        </div>
      ) : isAuthenticating ? (
        <LoadingIndicator />
      ) : isAuthenticated ? (
        <button onClick={logout} className={styles.button}>
          Log out
        </button>
      ) : (
        <button onClick={login} className={styles.button}>
          Log in
        </button>
      )}
    </div>
  )
}
