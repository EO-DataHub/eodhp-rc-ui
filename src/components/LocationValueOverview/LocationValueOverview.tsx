import { Spinner, Text } from '@radix-ui/themes'
import containerStyles from '../../library/genericStyles/containers.module.scss'
import locationValueStyles from './LocationValueOverview.module.scss'
import { LngLat } from 'maplibre-gl'

export const LocationValueOverview = ({
  isMarkerOnMap,
  layerLabel,
  locationValue,
  markerCoordinates,
  scenario,
  year,
}: {
  isMarkerOnMap: boolean
  layerLabel: string | undefined
  locationValue: number | string | null
  markerCoordinates: LngLat | undefined
  scenario?: string
  year?: string
}) => {
  const locationInformation =
    locationValue === null ? (
      <div className={locationValueStyles.overviewLoading}>
        <Spinner />
      </div>
    ) : (
      <div className={locationValueStyles.overview}>
        <div className={containerStyles.flexColumnStartStart}>
          <Text size="9" weight="bold">
            {locationValue}
          </Text>
          <Text size="4" weight="bold">
            {layerLabel}
          </Text>
        </div>
        <div>
          <table>
            <tbody>
              <tr>
                <th>Latitude:</th>
                <td>{markerCoordinates?.lat.toFixed(4)}°</td>
              </tr>
              <tr>
                <th>Longitude:</th>
                <td>{markerCoordinates?.lng.toFixed(4)}°</td>
              </tr>
              {year ? (
                <tr>
                  <th>Year:</th>
                  <td>{year}</td>
                </tr>
              ) : null}
              {scenario ? (
                <tr>
                  <th>Scenario:</th>
                  <td>{scenario}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    )
  return (
    <>
      {!isMarkerOnMap ? <>Select location on map to view details.</> : null}
      {isMarkerOnMap ? locationInformation : null}
    </>
  )
}
