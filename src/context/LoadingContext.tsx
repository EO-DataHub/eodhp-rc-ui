import { useState } from 'react'
import { ReactNode, createContext } from 'react'

interface LoadingContextValue {
  isMapLoading: boolean
  setIsMapLoading?: React.Dispatch<React.SetStateAction<boolean>>
}
export const LoadingContext = createContext<LoadingContextValue>({
  isMapLoading: false,
})

export const LoadingContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [isMapLoading, setIsMapLoading] = useState(false)

  return (
    <LoadingContext.Provider value={{ isMapLoading, setIsMapLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}
