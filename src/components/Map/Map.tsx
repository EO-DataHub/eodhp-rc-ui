import 'maplibre-gl/dist/maplibre-gl.css'

import mapStyles from './Map.module.css'
import { LoadingOverlay } from '../LoadingOverlay/LoadingOverlay'
import { ReactNode, useContext } from 'react'
import { LoadingContext } from '../../context/LoadingContext'

export const Map = ({
  additionalControls,
  legend,
  mapContainer,
}: {
  additionalControls?: React.ReactNode
  legend?: ReactNode
  mapContainer: React.RefObject<HTMLDivElement>
}) => {
  const { isMapLoading } = useContext(LoadingContext)

  return (
    <div className={mapStyles.mapContainer}>
      <LoadingOverlay isVisible={isMapLoading} />
      <div ref={mapContainer} className={mapStyles.map} />
      {additionalControls ? (
        <div className={mapStyles.extraMapControlsContainer}>
          {additionalControls}
        </div>
      ) : null}
      {legend ? (
        <div className={mapStyles.legendContainer}>{legend}</div>
      ) : null}
    </div>
  )
}
