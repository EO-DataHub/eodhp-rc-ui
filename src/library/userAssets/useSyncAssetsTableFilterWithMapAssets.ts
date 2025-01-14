import { useContext, useEffect, useMemo } from 'react'

import { Table as TanstackTable } from '@tanstack/table-core'
import { UserAssetForTable } from './convertUserAssets'
import { MapRef } from '../../components/Map/useMap'
import { UserAssets } from './userAssetTypes'
import { UserAssetsContext } from '../../context/UserAssetsContext'

export const useSyncAssetsTableFilterWithMapAssets = ({
  isMapLoaded,
  table,
  userAssetsForTable,
  updateUserAssetsInMap,
}: {
  isMapLoaded?: boolean
  mapRef?: MapRef
  table: TanstackTable<UserAssetForTable>
  userAssetsForTable: UserAssetForTable[]
  updateUserAssetsInMap: (assets: UserAssets) => void
}) => {
  const filteredRows = table.getFilteredRowModel().rows
  const { userAssets } = useContext(UserAssetsContext)

  const filteredAssetsForMap = useMemo(() => {
    const filteredFeatureIds = filteredRows.map((row) => row.original.id)
    return {
      type: 'FeatureCollection',
      features:
        userAssets?.features.filter((feature) =>
          filteredFeatureIds.includes(feature.properties.id),
        ) ?? [],
    } as UserAssets
  }, [filteredRows, userAssets?.features])

  useEffect(
    function syncMapWithTableFilter() {
      if (!userAssetsForTable.length || !isMapLoaded) return

      updateUserAssetsInMap(filteredAssetsForMap)
    },
    [
      filteredAssetsForMap,
      isMapLoaded,
      updateUserAssetsInMap,
      userAssetsForTable.length,
    ],
  )
}
