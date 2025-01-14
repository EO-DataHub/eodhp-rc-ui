import {
  useState,
  ReactNode,
  createContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { LngLat } from 'maplibre-gl'

interface AssetsPageContextValue {
  persistedMapCenter: LngLat | undefined
  persistedMapZoom: number | undefined
  setPersistedMapZoom?: Dispatch<SetStateAction<number | undefined>>
  setPersistedMapCenter?: Dispatch<SetStateAction<LngLat | undefined>>
}
export const AssetsPageContext = createContext<AssetsPageContextValue>({
  persistedMapCenter: undefined,
  persistedMapZoom: undefined,
})

export const AssetsPageContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [persistedMapCenter, setPersistedMapCenter] = useState<LngLat>()
  const [persistedMapZoom, setPersistedMapZoom] = useState<number>()

  return (
    <AssetsPageContext.Provider
      value={{
        persistedMapCenter,
        persistedMapZoom,
        setPersistedMapCenter,
        setPersistedMapZoom,
      }}
    >
      {children}
    </AssetsPageContext.Provider>
  )
}
