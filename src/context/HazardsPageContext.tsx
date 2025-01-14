import {
  useEffect,
  useState,
  ReactNode,
  createContext,
  Dispatch,
  SetStateAction,
} from 'react'
import {
  climateModelOptions,
  getOptionsByClimateModel,
  indicatorOptions,
} from '../library/api/fakeApiData'
import { LngLat } from 'maplibre-gl'

export type HazardMarkerValue = number | string | null
export interface HazardsPageContextValue {
  climateModel: string
  hazardIndicator: string
  markerCoordinates?: LngLat | undefined
  persistedMapCenter: LngLat | undefined
  persistedMapZoom: number | undefined
  scenario: string
  setClimateModel?: Dispatch<SetStateAction<string>>
  setHazardIndicator?: Dispatch<SetStateAction<string>>
  setMarkerCoordinates?: Dispatch<SetStateAction<LngLat | undefined>>
  setPersistedMapCenter?: Dispatch<SetStateAction<LngLat | undefined>>
  setPersistedMapZoom?: Dispatch<SetStateAction<number | undefined>>
  setScenario?: Dispatch<SetStateAction<string>>
  setYear?: Dispatch<SetStateAction<string>>
  year: string
  hazardMarkerValue: HazardMarkerValue
  setHazardMarkerValue?: Dispatch<SetStateAction<HazardMarkerValue>>
}
export const HazardsPageContext = createContext<HazardsPageContextValue>({
  climateModel: '',
  hazardIndicator: '',
  scenario: '',
  year: '',
  persistedMapCenter: undefined,
  persistedMapZoom: undefined,
  hazardMarkerValue: null,
})

export const HazardContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [climateModel, setClimateModel] = useState(climateModelOptions[0].value)
  const [hazardIndicator, setHazardIndicator] = useState(
    indicatorOptions[0].value,
  )
  const [scenario, setScenario] = useState('')
  const [year, setYear] = useState('')
  const [persistedMapCenter, setPersistedMapCenter] = useState<LngLat>()
  const [persistedMapZoom, setPersistedMapZoom] = useState<number>()
  const [markerCoordinates, setMarkerCoordinates] = useState<
    LngLat | undefined
  >()
  const [hazardMarkerValue, setHazardMarkerValue] = useState<
    number | string | null
  >(null)

  useEffect(
    function setScenrioAndYearDefaultFromClimateModel() {
      const { scenarioOptions, yearOptions } =
        getOptionsByClimateModel(climateModel)
      setScenario(scenarioOptions[0].value)
      setYear(yearOptions[0])
    },
    [climateModel],
  )
  return (
    <HazardsPageContext.Provider
      value={{
        climateModel,
        hazardIndicator,
        markerCoordinates,
        persistedMapCenter,
        persistedMapZoom,
        scenario,
        setClimateModel,
        setHazardIndicator,
        setMarkerCoordinates,
        setPersistedMapCenter,
        setPersistedMapZoom,
        setScenario,
        setYear,
        year,
        hazardMarkerValue,
        setHazardMarkerValue,
      }}
    >
      {children}
    </HazardsPageContext.Provider>
  )
}
