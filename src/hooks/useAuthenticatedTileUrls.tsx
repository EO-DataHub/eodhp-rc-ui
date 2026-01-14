import { useContext } from 'react'
import {
  AuthenticatedTileUrlsContext,
  type AuthenticatedTileUrlsContextValue,
} from '../context/AuthenticatedTileUrlsContext'

export function useAuthenticatedTileUrls(): AuthenticatedTileUrlsContextValue {
  const context = useContext(AuthenticatedTileUrlsContext)
  if (!context) {
    throw new Error('useAuthenticatedTileUrls must be used within AuthenticatedTileUrlsProvider')
  }
  return context
}
