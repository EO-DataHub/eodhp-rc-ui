import { Tooltip } from '@radix-ui/themes'
import { ZoomInIcon, ZoomOutIcon, ArrowUpIcon } from '@radix-ui/react-icons'
import { MapRef } from 'react-map-gl/maplibre'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { GeoJSONDownload } from './GeoJSONDownload'
import styles from './DrawingToolbar.module.scss'

// Import SVG icons
import SelectIcon from '@/assets/icons/select.svg?react'
import RectangleIcon from '@/assets/icons/rectangle.svg?react'
import PolygonIcon from '@/assets/icons/pencil.svg?react'
import DeleteIcon from '@/assets/icons/trash.svg?react'

interface DrawingToolbarProps {
  onModeChange: (mode: 'rectangle' | 'polygon' | null) => void
  currentMode: 'rectangle' | 'polygon' | null
  onDelete: () => void
  hasAoi: boolean
  aoi: GeoJSON.Feature | null
  mapRef: React.RefObject<MapRef>
}

export const DrawingToolbar = ({
  onModeChange,
  currentMode,
  onDelete,
  hasAoi,
  aoi,
  mapRef,
}: DrawingToolbarProps) => {
  const handleRectangleClick = () => {
    onModeChange(currentMode === 'rectangle' ? null : 'rectangle')
  }

  const handlePolygonClick = () => {
    onModeChange(currentMode === 'polygon' ? null : 'polygon')
  }

  const handleSelectClick = () => {
    onModeChange(null) // null mode means select mode
  }

  const handleDeleteClick = () => {
    dataFinderStore.send({ type: 'drawDelete' })
    onDelete()
  }

  const handleZoomIn = () => {
    mapRef.current?.getMap().zoomIn()
  }

  const handleZoomOut = () => {
    mapRef.current?.getMap().zoomOut()
  }

  const handleResetNorth = () => {
    const map = mapRef.current?.getMap()
    if (map) {
      map.resetNorthPitch()
    }
  }

  return (
    <div className={styles.toolbar}>
      {/* Navigation Controls Section */}
      <div className={styles.controlGroup}>
        <Tooltip content="Zoom in" delayDuration={2500}>
          <button
            onClick={handleZoomIn}
            aria-label="Zoom in"
            className={styles.controlButton}
            type="button"
          >
            <ZoomInIcon />
          </button>
        </Tooltip>
        <Tooltip content="Zoom out" delayDuration={2500}>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom out"
            className={styles.controlButton}
            type="button"
          >
            <ZoomOutIcon />
          </button>
        </Tooltip>
        <Tooltip content="Reset north" delayDuration={2500}>
          <button
            onClick={handleResetNorth}
            aria-label="Reset north"
            className={styles.controlButton}
            type="button"
          >
            <ArrowUpIcon />
          </button>
        </Tooltip>
      </div>

      {/* Drawing Controls Section */}
      <div className={styles.controlGroup}>
        <Tooltip content="Select mode (select, move, edit)" delayDuration={2500}>
          <button
            onClick={handleSelectClick}
            aria-label="Select mode"
            className={`${styles.controlButton} ${currentMode === null ? styles.active : ''}`}
            type="button"
          >
            <SelectIcon />
          </button>
        </Tooltip>
        <Tooltip content="Draw rectangle" delayDuration={2500}>
          <button
            onClick={handleRectangleClick}
            aria-label="Draw rectangle"
            className={`${styles.controlButton} ${currentMode === 'rectangle' ? styles.active : ''}`}
            type="button"
          >
            <RectangleIcon />
          </button>
        </Tooltip>
        <Tooltip content="Draw polygon" delayDuration={2500}>
          <button
            onClick={handlePolygonClick}
            aria-label="Draw polygon"
            className={`${styles.controlButton} ${currentMode === 'polygon' ? styles.active : ''}`}
            type="button"
          >
            <PolygonIcon />
          </button>
        </Tooltip>
        <Tooltip content="Delete AOI" delayDuration={2500}>
          <button
            onClick={handleDeleteClick}
            disabled={!hasAoi}
            aria-label="Delete AOI"
            className={styles.controlButton}
            type="button"
          >
            <DeleteIcon />
          </button>
        </Tooltip>
        <GeoJSONDownload aoi={aoi} disabled={!hasAoi} />
      </div>
    </div>
  )
}
