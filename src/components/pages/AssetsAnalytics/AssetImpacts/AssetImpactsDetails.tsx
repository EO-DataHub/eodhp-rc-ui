// @ts-expect-error  turf has an issue delaring its types
import { bbox as turfBbox } from '@turf/turf'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import * as Tabs from '@radix-ui/react-tabs'

import {
  AnalysedUserAssets,
  RowSelection,
  UserAssets,
} from '../../../../library/userAssets/userAssetTypes'
import { AssetsTable } from '../../../AssetsTable/AssetsTable'
import { Map } from '../../../Map/Map'
import { useAssetPortfolios } from '../../../../library/userAssets/useAssetPortfolios'
import { useMap } from '../../../Map/useMap'
import detailStyles from './AssetImpactDetails.module.scss'
import { checkAndFitBounds } from '../../../../library/maplibre/checkAndFitBounds'
import { MapLayerMouseEvent } from 'maplibre-gl'
import {
  DEFAULT_USER_ASSET_COLUMNS,
  MAPLIBRE_FIT_BOUNDS_MAX_ZOOM,
  MapSourceIds,
} from '../../../../configuration/constants'
import {
  AnalysedOscUserAssetForTable,
  UserAssetForTable,
} from '../../../../library/userAssets/convertUserAssets'
import { ResultsVisualisation } from './ResultsVisualisation'
import { useSyncAssetsTableSelectionWithMapAssets } from '../../../../library/userAssets/useSyncAssetsTableSelectionWithMapAssets'

export const AssetImpactsDetails = ({
  analysedUserAssets,
  analysedUserAssetsForTable,
  assetToDetailId,
  rowSelection,
  setAssetToDetailId,
  setRowSelection,
}: {
  analysedUserAssets: UserAssets
  analysedUserAssetsForTable:
    | UserAssetForTable[]
    | AnalysedOscUserAssetForTable[]
  rowSelection: RowSelection
  assetToDetailId: string | number | undefined
  setRowSelection: Dispatch<SetStateAction<RowSelection>>
  setAssetToDetailId: Dispatch<SetStateAction<string | number | undefined>>
}) => {
  const { mapContainer, mapRef, isMapLoaded } = useMap()
  const haveAssetsBeenAddedToMap = useRef(false)

  const assetToDetail = useMemo(() => {
    const assetsToDetailFeature = analysedUserAssets?.features.find(
      (feature) => feature.properties.id === assetToDetailId,
    )

    return assetsToDetailFeature
      ? ({
          type: 'FeatureCollection',
          features: [assetsToDetailFeature],
        } as unknown as UserAssets)
      : undefined
  }, [assetToDetailId, analysedUserAssets?.features])

  const analysedUserAssetForTable = analysedUserAssetsForTable.find(
    (asset) => asset.id === assetToDetailId,
  )

  const showMarkerSelectedSymbology = useCallback(
    (id: number | string | undefined) => {
      if (!id) return
      analysedUserAssets?.features.forEach((feature) => {
        mapRef.current?.setFeatureState(
          {
            source: MapSourceIds.USER_ASSETS,
            id: feature.properties.id,
          },
          {
            isSelected: feature.properties.id === id,
          },
        )
      })
    },
    [analysedUserAssets?.features, mapRef],
  )

  const onAssetMarkerClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const id = event.features?.[0].properties.id
      setAssetToDetailId(id)
      showMarkerSelectedSymbology(id)
    },
    [setAssetToDetailId, showMarkerSelectedSymbology],
  )
  const { updateUserAssetsInMap } = useAssetPortfolios({
    isMapLoaded,
    mapRef,
    onAssetMarkerClick,
    zoomToUserAssets: false,
  })

  useEffect(
    function addAssetsToMapOnce() {
      if (
        !analysedUserAssets ||
        !updateUserAssetsInMap ||
        !isMapLoaded ||
        !mapRef.current ||
        haveAssetsBeenAddedToMap.current
      ) {
        return
      }
      updateUserAssetsInMap(analysedUserAssets)
      const userAssetBounds = turfBbox(assetToDetail)
      checkAndFitBounds({
        map: mapRef.current,
        bounds: userAssetBounds,
        options: { maxZoom: MAPLIBRE_FIT_BOUNDS_MAX_ZOOM },
      })
      showMarkerSelectedSymbology(assetToDetail?.features[0].properties.id)
      haveAssetsBeenAddedToMap.current = true
    },
    [
      analysedUserAssets,
      assetToDetail,
      isMapLoaded,
      mapRef,
      showMarkerSelectedSymbology,
      updateUserAssetsInMap,
    ],
  )

  const removeDefaultColumnInfo = (
    analysedUserAssetForTable: UserAssetForTable | undefined,
  ) => {
    if (!analysedUserAssetForTable) return {}

    const analysedUserAssetForTableCopy = { ...analysedUserAssetForTable }
    DEFAULT_USER_ASSET_COLUMNS.forEach((columnName) => {
      delete analysedUserAssetForTableCopy[columnName]
    })

    return analysedUserAssetForTableCopy
  }

  const extraPropertiesList = analysedUserAssetForTable
    ? Object.entries(removeDefaultColumnInfo(analysedUserAssetForTable))
    : []

  const { toggleAllMapAssetsSelection, toggleMapAssetSelection } =
    useSyncAssetsTableSelectionWithMapAssets({
      isMapLoaded,
      mapRef,
      userAssetsForTable: analysedUserAssetsForTable,
      rowSelection,
    })
  return (
    <div className={detailStyles.detailsWrapper}>
      {assetToDetail ? (
        <AssetsTable
          userAssetsForTable={
            [analysedUserAssetForTable] as UserAssetForTable[]
          }
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          showPageSelector={false}
          showSearch={false}
          showExtraColumnsToggle={false}
          showSelectBoxes={false}
          showViewDetailsButton={false}
          areExtraColumnsVisibleInitially={false}
          toggleAllMapAssetsSelection={toggleAllMapAssetsSelection}
          toggleMapAssetSelection={toggleMapAssetSelection}
        />
      ) : null}
      <div className={detailStyles.chartAndMapWrapper}>
        <Tabs.Root defaultValue="valuesList" className={detailStyles.tabsRoot}>
          <Tabs.List className={detailStyles.tabsList}>
            <Tabs.Trigger value="valuesList">
              Asset Analysis Results
            </Tabs.Trigger>
            <Tabs.Trigger value="visualisation">Visualisation</Tabs.Trigger>
          </Tabs.List>
          <div className={detailStyles.tabsContentWrapper}>
            <Tabs.Content
              value="valuesList"
              className={detailStyles.tabContent}
            >
              <div className={detailStyles.verticalProperties}>
                <table>
                  <tbody>
                    {extraPropertiesList.map(([key, value]) => (
                      <tr key={key}>
                        <th>{key}</th>
                        <td>{value as string | number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tabs.Content>
            <Tabs.Content
              value="visualisation"
              className={detailStyles.tabContent}
            >
              <ResultsVisualisation
                assetToDetail={assetToDetail as AnalysedUserAssets}
              />
            </Tabs.Content>
          </div>
        </Tabs.Root>
        <Map mapContainer={mapContainer} />
      </div>
    </div>
  )
}
