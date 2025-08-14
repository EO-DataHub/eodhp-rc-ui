import { ReactNode, useRef, useState } from 'react'
import { RestoreAOIContext } from '@/context/RestoreAOIContext'

export const RestoreAOIContextProvider = ({ children }: { children: ReactNode }) => {
  const hasPromptedRef = useRef(false)
  const [shouldShowRestoreAOIDialog, setShouldShowRestoreAOIDialog] = useState(false)

  return (
    <RestoreAOIContext.Provider
      value={{ hasPromptedRef, shouldShowRestoreAOIDialog, setShouldShowRestoreAOIDialog }}
    >
      {children}
    </RestoreAOIContext.Provider>
  )
}
