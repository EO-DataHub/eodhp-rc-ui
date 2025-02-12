import { useContext } from 'react'
import { Text } from '@radix-ui/themes'
import { AuthenticationContext } from '../../context/AuthenticationContext'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import styles from './LoginButton.module.scss'

export const LoginButton = () => {
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

  return (
    <div className={styles.button}>
      {isAuthenticating ? (
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
