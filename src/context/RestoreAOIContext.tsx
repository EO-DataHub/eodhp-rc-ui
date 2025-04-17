import { createContext } from 'react'

interface RestoreAOIContextValue {
  hasPromptedRef: React.MutableRefObject<boolean> | null
  shouldShowRestoreAOIDialog: boolean
  setShouldShowRestoreAOIDialog: React.Dispatch<React.SetStateAction<boolean>>
}

export const RestoreAOIContext = createContext<RestoreAOIContextValue>({
  hasPromptedRef: null,
  shouldShowRestoreAOIDialog: false,
  setShouldShowRestoreAOIDialog: () => Promise.resolve(),
})
