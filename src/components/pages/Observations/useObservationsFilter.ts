import { useEffect, useMemo, useState } from 'react'
import { ObservationTypeConfig } from '../../../library/api/fakeApiData'

export const useObservationsFilter = ({
  selectedObservationTypeConfig,
}: {
  selectedObservationTypeConfig: ObservationTypeConfig | undefined
}) => {
  const [selectedSensor, setSelectedSensor] = useState<string>('All')
  const unfilteredDatasetOptions =
    selectedObservationTypeConfig?.datasetOptions ?? []
  const sensors = useMemo(
    () => [
      ...new Set(
        selectedObservationTypeConfig?.datasetOptions
          .map((datasetOption) => datasetOption.sensor)
          .filter(Boolean) as string[],
      ),
    ],

    [selectedObservationTypeConfig?.datasetOptions],
  )

  const sensorFilterOptions = useMemo(() => ['All', ...sensors], [sensors])

  const isSensorFilterUsed = !!sensors?.length

  const filteredDatasetOptions = unfilteredDatasetOptions.filter((option) =>
    isSensorFilterUsed && selectedSensor !== 'All'
      ? option.sensor === selectedSensor
      : true,
  )

  useEffect(
    function resetSelectedSensor() {
      const isSelectedSensorValidForCurrentObservationType =
        sensorFilterOptions.includes(selectedSensor)

      if (!isSelectedSensorValidForCurrentObservationType) {
        setSelectedSensor('All')
      }
    },
    [isSensorFilterUsed, selectedSensor, sensorFilterOptions],
  )

  return {
    sensorFilterOptions,
    isSensorFilterUsed,
    selectedSensor,
    setSelectedSensor,
    filteredDatasetOptions,
  }
}
