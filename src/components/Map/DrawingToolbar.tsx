import { IconButton, Tooltip, Flex } from '@radix-ui/themes'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { GeoJSONDownload } from './GeoJSONDownload'
import styles from './DrawingToolbar.module.scss'

// Import SVG icons
import SelectIcon from '@/assets/icons/select.svg?react'
import RectangleIcon from '@/assets/icons/rectangle.svg?react'
import PolygonIcon from '@/assets/icons/freehand.svg?react'
import DeleteIcon from '@/assets/icons/delete.svg?react'

interface DrawingToolbarProps {
  onModeChange: (mode: 'rectangle' | 'polygon' | null) => void
  currentMode: 'rectangle' | 'polygon' | null
  onDelete: () => void
  hasAoi: boolean
  aoi: GeoJSON.Feature | null
}

export const DrawingToolbar = ({
  onModeChange,
  currentMode,
  onDelete,
  hasAoi,
  aoi,
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

  return (
    <Flex
      direction="column"
      gap="1"
      className={styles.toolbar}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 5, // Lower than side panel (10) but above map
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        padding: '4px',
      }}
    >
      <Tooltip content="Select mode (select, move, edit)">
        <IconButton
          size="2"
          variant={currentMode === null ? 'solid' : 'soft'}
          onClick={handleSelectClick}
          aria-label="Select mode"
        >
          <SelectIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Draw rectangle">
        <IconButton
          size="2"
          variant={currentMode === 'rectangle' ? 'solid' : 'soft'}
          onClick={handleRectangleClick}
          aria-label="Draw rectangle"
        >
          <RectangleIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Draw polygon">
        <IconButton
          size="2"
          variant={currentMode === 'polygon' ? 'solid' : 'soft'}
          onClick={handlePolygonClick}
          aria-label="Draw polygon"
        >
          <PolygonIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Delete AOI">
        <IconButton
          size="2"
          variant="soft"
          color="red"
          onClick={handleDeleteClick}
          disabled={!hasAoi}
          aria-label="Delete AOI"
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
      <GeoJSONDownload aoi={aoi} disabled={!hasAoi} />
    </Flex>
  )
}
