import { Tooltip } from '@radix-ui/themes'
import DownloadIcon from '@/assets/icons/download.svg?react'
import styles from './DrawingToolbar.module.scss'

interface GeoJSONDownloadProps {
  aoi: GeoJSON.Feature | null
  disabled?: boolean
}

/**
 * Downloads the current AOI as a GeoJSON file
 */
export const GeoJSONDownload = ({ aoi, disabled }: GeoJSONDownloadProps) => {
  const handleDownload = () => {
    if (!aoi) return

    // Create GeoJSON FeatureCollection
    const geoJson = {
      type: 'FeatureCollection' as const,
      features: [aoi],
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(geoJson, null, 2)

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aoi-${new Date().toISOString().split('T')[0] ?? 'unknown'}.geojson`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Tooltip content="Download AOI as GeoJSON" delayDuration={2500}>
      <button
        onClick={handleDownload}
        disabled={(disabled ?? false) || !aoi}
        aria-label="Download AOI as GeoJSON"
        className={styles.controlButton}
        type="button"
      >
        <DownloadIcon />
      </button>
    </Tooltip>
  )
}
