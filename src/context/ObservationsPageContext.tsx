import {
  useState,
  ReactNode,
  createContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { LngLat } from 'maplibre-gl'
import {
  observationTypeConfigs,
  observationMenuItemsLondon,
  ObservationTypeConfig,
  ObservationDatasetOption,
} from '../library/api/fakeApiData'
import { useObservationsFilter } from '../components/pages/Observations/useObservationsFilter'

export type ObservationMarkerValue = number | string | null

export interface ObservationsPageContextValue {
  markerCoordinates?: LngLat | undefined
  observationMarkerValue?: ObservationMarkerValue
  observationTypeConfigs?: ObservationTypeConfig[] | undefined
  persistedMapCenter: LngLat | undefined
  persistedMapZoom: number | undefined
  selectedObservationLayerUrl: string
  selectedObservationType: string
  selectedObservationTypeConfig?: ObservationTypeConfig | undefined
  setMarkerCoordinates?: Dispatch<SetStateAction<LngLat | undefined>>
  setObservationMarkerValue?: Dispatch<SetStateAction<ObservationMarkerValue>>
  setPersistedMapCenter?: Dispatch<SetStateAction<LngLat | undefined>>
  setPersistedMapZoom?: Dispatch<SetStateAction<number | undefined>>
  setSelectedObservationLayerUrl?: Dispatch<SetStateAction<string>>
  setSelectedObservationType?: Dispatch<SetStateAction<string>>
  sensorFilterOptions: string[]
  isSensorFilterUsed: boolean
  selectedSensor: string
  setSelectedSensor?: Dispatch<SetStateAction<string>>
  filteredDatasetOptions: ObservationDatasetOption[]
}

export const ObservationsPageContext =
  createContext<ObservationsPageContextValue>({
    persistedMapCenter: undefined,
    persistedMapZoom: undefined,
    selectedObservationLayerUrl: observationMenuItemsLondon[0].value,
    selectedObservationType: 'london',
    sensorFilterOptions: [],
    isSensorFilterUsed: false,
    selectedSensor: 'All',
    filteredDatasetOptions: [],
  })

export const ObservationsContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [persistedMapCenter, setPersistedMapCenter] = useState<LngLat>()
  const [persistedMapZoom, setPersistedMapZoom] = useState<number>()
  const [selectedObservationType, setSelectedObservationType] = useState(
    observationTypeConfigs[0].value,
  )
  const [selectedObservationLayerUrl, setSelectedObservationLayerUrl] =
    useState(observationTypeConfigs[0].datasetOptions[0].value)

  const selectedObservationTypeConfig = observationTypeConfigs.find(
    (observationTypeConfig) =>
      observationTypeConfig.value === selectedObservationType,
  )

  const [markerCoordinates, setMarkerCoordinates] = useState<
    LngLat | undefined
  >()

  const [observationMarkerValue, setObservationMarkerValue] = useState<
    number | string | null
  >(null)

  const {
    sensorFilterOptions,
    isSensorFilterUsed,
    selectedSensor,
    setSelectedSensor,
    filteredDatasetOptions,
  } = useObservationsFilter({ selectedObservationTypeConfig })

  return (
    <ObservationsPageContext.Provider
      value={{
        markerCoordinates,
        observationMarkerValue,
        observationTypeConfigs,
        persistedMapCenter,
        persistedMapZoom,
        selectedObservationLayerUrl,
        selectedObservationType,
        selectedObservationTypeConfig,
        setMarkerCoordinates,
        setObservationMarkerValue,
        setPersistedMapCenter,
        setPersistedMapZoom,
        setSelectedObservationLayerUrl,
        setSelectedObservationType,
        sensorFilterOptions,
        isSensorFilterUsed,
        selectedSensor,
        setSelectedSensor,
        filteredDatasetOptions,
      }}
    >
      {children}
    </ObservationsPageContext.Provider>
  )
}
