import { createContext } from 'react'

export interface OpenCosmosUser {
  sub?: string
  name?: string
  email?: string
}

export interface OpenCosmosAuthContextType {
  isConnected: boolean
  isLoading: boolean
  hasConfiguration: boolean
  error?: string
  user?: OpenCosmosUser
  connect: (organizationId: number) => Promise<void>
  disconnect: () => Promise<void>
}

export const OpenCosmosAuthContext = createContext<OpenCosmosAuthContextType | null>(null)
OpenCosmosAuthContext.displayName = 'OpenCosmosAuthContext'
