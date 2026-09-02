import { useContext } from 'react'
import { OpenCosmosAuthContext } from '@/context/OpenCosmosAuthContext'

export const useOpenCosmosAuth = () => {
  const context = useContext(OpenCosmosAuthContext)
  if (!context) {
    throw new Error('useOpenCosmosAuth must be used within an OpenCosmosAuthProvider')
  }
  return context
}
