import { useCallback, useContext, useEffect } from 'react'
// @ts-expect-error - no types for this library
import { bbox as turfBbox } from '@turf/turf'

import { MapRef } from '../../components/Map/useMap'
import {
  MAPLIBRE_FIT_BOUNDS_PADDING,
  MAPLIBRE_FIT_BOUNDS_MAX_ZOOM,
  MapSourceIds,
} from '../../configuration/constants'
import { UserAssetForTable } from './convertUserAssets'
import { RowSelection } from './userAssetTypes'
import { UserAssetsContext } from '../../context/UserAssetsContext'
import { areBoundsValid } from '../maplibre/isGeometryValid'
import { useDebouncedCallback } from 'use-debounce'

export const useSyncAssetsTableSelectionWithMapAssets = ({
  isMapLoaded,
  mapRef,
  userAssetsForTable,
  rowSelection,
}: {
  isMapLoaded?: boolean
  mapRef?: MapRef
  userAssetsForTable: UserAssetForTable[]
  rowSelection: RowSelection
}) => {
  const { userAssets } = useContext(UserAssetsContext)

  const zoomToSelectedAssets = useDebouncedCallback(
    useCallback(() => {
      if (!isMapLoaded || !mapRef?.current || !userAssets) return
      const rowSelectionIds = Object.keys(rowSelection)

      const selectedAssetFeatures = userAssets.features.filter(
        (assetFeature) => {
          return rowSelectionIds.includes(String(assetFeature.properties.id))
        },
      )
      const selectedAssets = { ...userAssets, features: selectedAssetFeatures }

      const selectedAssetsBbox = turfBbox(selectedAssets)
      if (areBoundsValid(selectedAssetsBbox)) {
        mapRef.current.fitBounds(selectedAssetsBbox, {
          padding: MAPLIBRE_FIT_BOUNDS_PADDING,
          maxZoom: MAPLIBRE_FIT_BOUNDS_MAX_ZOOM,
        })
      }
    }, [isMapLoaded, mapRef, rowSelection, userAssets]),
    1000,
  )

  useEffect(
    function zoomToSelectedAssetsOnRowSelectionChange() {
      zoomToSelectedAssets()
    },
    [rowSelection, zoomToSelectedAssets],
  )

  const toggleMapAssetSelection = useCallback(
    ({ isSelected, id }: { isSelected: boolean; id: string }) => {
      if (!mapRef?.current || !isMapLoaded) return
      mapRef.current.setFeatureState(
        {
          source: MapSourceIds.USER_ASSETS,
          id,
        },
        {
          isSelected,
        },
      )
    },
    [isMapLoaded, mapRef],
  )

  const toggleAllMapAssetsSelection = useCallback(
    (isSelected: boolean) => {
      userAssetsForTable.forEach((asset) => {
        toggleMapAssetSelection({
          id: String(asset.id),
          isSelected,
        })
      })
    },
    [toggleMapAssetSelection, userAssetsForTable],
  )

  return {
    toggleAllMapAssetsSelection,
    toggleMapAssetSelection,
  }
}
