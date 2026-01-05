import { useEffect } from 'react'
import { TerraDraw } from 'terra-draw'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { isValidAoiFeature } from '@/lib/terradraw/helpers/featureUtils'
import { getExistingFeatureIds } from '@/lib/terradraw/helpers/featureUtils'

interface UseTerraDrawSyncOptions {
  terraDrawRef: React.RefObject<TerraDraw | null>
  isUpdatingFromTerraDrawRef: React.MutableRefObject<boolean>
  lastAoiRef: React.MutableRefObject<GeoJSON.Feature | undefined>
}

/**
 * Hook to handle bidirectional synchronization between TerraDraw and store
 * @param options - Configuration options
 */
export function useTerraDrawSync({
  terraDrawRef,
  isUpdatingFromTerraDrawRef,
  lastAoiRef,
}: UseTerraDrawSyncOptions) {
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)

  useEffect(() => {
    if (!terraDrawRef.current || isUpdatingFromTerraDrawRef.current) return

    // Compare by geometry string to avoid reference equality issues
    const currentAoiGeometry = aoi?.geometry ? JSON.stringify(aoi.geometry) : null
    const lastAoiGeometry = lastAoiRef.current?.geometry
      ? JSON.stringify(lastAoiRef.current.geometry)
      : null

    // If aoi was added/updated via storeAoi (and geometry actually changed)
    if (aoi && currentAoiGeometry !== lastAoiGeometry && isValidAoiFeature(aoi)) {
      isUpdatingFromTerraDrawRef.current = true
      // Use setTimeout to ensure any ongoing TerraDraw operations complete first
      void setTimeout(() => {
        try {
          const td = terraDrawRef.current
          if (!td) {
            isUpdatingFromTerraDrawRef.current = false
            return
          }

          // Check if there are features to clear before clearing
          const existingIds = getExistingFeatureIds(td)
          if (existingIds.length > 0) {
            td.clear()
          }

          td.addFeatures([aoi as Parameters<typeof td.addFeatures>[0][0]])
          lastAoiRef.current = aoi
        } catch (error) {
          // Log error instead of suppressing
          // eslint-disable-next-line no-console
          console.warn('Error syncing AOI to TerraDraw:', error)
        }
        void setTimeout(() => {
          isUpdatingFromTerraDrawRef.current = false
        }, 100)
      }, 0)
    }
    // If aoi was removed
    else if (!aoi && lastAoiRef.current) {
      isUpdatingFromTerraDrawRef.current = true
      // Use setTimeout to ensure any ongoing TerraDraw operations complete first
      void setTimeout(() => {
        try {
          const td = terraDrawRef.current
          if (!td) {
            isUpdatingFromTerraDrawRef.current = false
            return
          }

          // Check if there are features to clear before clearing
          const existingIds = getExistingFeatureIds(td)
          if (existingIds.length > 0) {
            td.clear()
          }
          lastAoiRef.current = undefined
        } catch (error) {
          // Log error instead of suppressing
          // eslint-disable-next-line no-console
          console.warn('Error clearing AOI from TerraDraw:', error)
        }
        void setTimeout(() => {
          isUpdatingFromTerraDrawRef.current = false
        }, 100)
      }, 0)
    }
  }, [aoi, terraDrawRef, isUpdatingFromTerraDrawRef, lastAoiRef])
}
