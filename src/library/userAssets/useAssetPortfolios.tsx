import { Badge, DataList, Link, Separator } from '@radix-ui/themes'
// @ts-expect-error  turf has an issue delaring its types
import { bbox as turfBbox } from '@turf/turf'
import { MapLayerMouseEvent, Popup } from 'maplibre-gl'
import { useCallback, useContext, useState } from 'react'
import ReactDOM from 'react-dom/client'

import {
  MAPLIBRE_FIT_BOUNDS_PADDING,
  MapLayerIds,
  MAPLIBRE_FIT_BOUNDS_MAX_ZOOM,
  MapSourceIds,
} from '../../configuration/constants'

import { areBoundsValid } from '../maplibre/isGeometryValid'
import { getIsFeaturePoint } from '../geoJson/getIsFeaturePoint'
import { LoadingContext } from '../../context/LoadingContext'
import { MapRef } from '../../components/Map/useMap'

import { UserAssets } from './userAssetTypes'
import assetsPopupStyles from './AssetsPopup.module.scss'
import { AuthenticationContext } from '../../context/AuthenticationContext'
import { toast } from 'react-toastify'
import { getUploadedFileUrl } from '../api/getUrls'

export const useAssetPortfolios = ({
  isMapLoaded,
  mapRef,
  onHighlightInTableClick,
  onMapMarkerPopupClose,
  onAssetMarkerClick,
  zoomToUserAssets = true,
}: {
  isMapLoaded: boolean | undefined
  mapRef: MapRef | undefined
  onHighlightInTableClick?: (id: string) => void
  onMapMarkerPopupClose?: () => void
  onAssetMarkerClick?: (event: MapLayerMouseEvent) => void
  zoomToUserAssets?: boolean
}) => {
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false)

  const { setIsMapLoading } = useContext(LoadingContext)
  const { authenticatedAxios, workspaceUserName } = useContext(
    AuthenticationContext,
  )

  const removeUserAssetsFromMap = useCallback(() => {
    if (!mapRef?.current || !setIsMapLoading) return

    setIsMapLoading(true)

    void mapRef.current.once('idle', () => {
      setIsMapLoading(false)
    })

    mapRef.current.removeSource(MapSourceIds.USER_ASSETS)
    mapRef.current.removeLayer(MapLayerIds.USER_ASSETS_POINTS)
    mapRef.current.removeLayer(MapLayerIds.USER_ASSETS_LINES)
    mapRef.current.removeLayer(MapLayerIds.USER_ASSETS_POLYGONS_FILL)
    mapRef.current.removeLayer(MapLayerIds.USER_ASSETS_POLYGONS_STROKE)
  }, [setIsMapLoading, mapRef])

  const updateUserAssetsInMap = useCallback(
    (userAssets: UserAssets) => {
      if (!mapRef?.current || !userAssets || !setIsMapLoading || !isMapLoaded)
        return

      const cssStyles = window.getComputedStyle(document.body)

      setIsMapLoading(true)

      void mapRef.current.once('idle', () => {
        setIsMapLoading(false)
      })

      const userAssetBounds = turfBbox(userAssets)
      const userAssetsSource = mapRef.current.getSource(
        MapSourceIds.USER_ASSETS,
      ) as maplibregl.GeoJSONSource
      const userAssetsPointsLayer = mapRef.current.getLayer(
        MapLayerIds.USER_ASSETS_POINTS,
      )
      const userAssetsLinesLayer = mapRef.current.getLayer(
        MapLayerIds.USER_ASSETS_LINES,
      )
      const userAssetsPolygonsFillLayer = mapRef.current.getLayer(
        MapLayerIds.USER_ASSETS_POLYGONS_FILL,
      )
      const userAssetsPolygonsStrokeLayer = mapRef.current.getLayer(
        MapLayerIds.USER_ASSETS_POLYGONS_STROKE,
      )

      const handleMarkerClick = (event: MapLayerMouseEvent) => {
        if (!mapRef.current) return

        const clickedFeature = event.features?.[0]
        if (!clickedFeature) return
        const isClickedFeatureAPoint = getIsFeaturePoint(clickedFeature)
        // @ts-expect-error - maplibre-gl types are contradictory with docs
        const coordinates = clickedFeature?.geometry.coordinates.slice()
        const itemId = clickedFeature?.properties.id

        const additionalPropertiesToShow = { ...clickedFeature?.properties }
        delete additionalPropertiesToShow.id
        delete additionalPropertiesToShow['']

        const additionalPropertiesToShowEntries = Object.entries(
          additionalPropertiesToShow,
        )

        const adjustedCoordinates = [...coordinates]
        // Ensure popup appears over correct world 'copy'
        while (Math.abs(event.lngLat.lng - adjustedCoordinates[0]) > 180) {
          adjustedCoordinates[0] +=
            event.lngLat.lng > adjustedCoordinates[0] ? 360 : -360
        }

        const popupContent = (
          <div className={assetsPopupStyles.assetsPopupContent}>
            <DataList.Root
              orientation={{ initial: 'vertical', sm: 'horizontal' }}
              className={assetsPopupStyles.assetPopupDatalistRoot}
            >
              <DataList.Item>
                <DataList.Label>ID</DataList.Label>
                <DataList.Value>{itemId}</DataList.Value>
              </DataList.Item>

              {isClickedFeatureAPoint ? (
                <DataList.Item>
                  <DataList.Label>Latitude</DataList.Label>
                  <DataList.Value>
                    {adjustedCoordinates[1]?.toFixed(4)}°
                  </DataList.Value>
                </DataList.Item>
              ) : null}
              {isClickedFeatureAPoint ? (
                <DataList.Item>
                  <DataList.Label>Longitude</DataList.Label>
                  <DataList.Value>
                    {adjustedCoordinates[0]?.toFixed(4)}°
                  </DataList.Value>
                </DataList.Item>
              ) : null}
              {additionalPropertiesToShowEntries.map(([key, value]) => (
                <DataList.Item key={key}>
                  <DataList.Label>{key}</DataList.Label>
                  <DataList.Value>
                    {value ? (
                      value
                    ) : (
                      <Badge variant="soft" color="gray">
                        Data Unavailable
                      </Badge>
                    )}
                  </DataList.Value>
                </DataList.Item>
              ))}
            </DataList.Root>

            {onHighlightInTableClick ? (
              <>
                <Separator size="4" />
                <div className={assetsPopupStyles.assetsPopupActionRow}>
                  <Link asChild>
                    <button
                      onClick={() => {
                        onHighlightInTableClick(itemId)
                      }}
                    >
                      Highlight in Table
                    </button>
                  </Link>{' '}
                </div>
              </>
            ) : null}
          </div>
        )

        const popupContentHack = document.createElement('div')
        ReactDOM.createRoot(popupContentHack).render(popupContent)
        new Popup()
          .setDOMContent(popupContentHack)
          .setLngLat(event.lngLat)
          .addTo(mapRef.current)
          .on('close', () => {
            onMapMarkerPopupClose?.()
          })
      }

      const markerClickHandlerToUse = onAssetMarkerClick ?? handleMarkerClick

      const handleMarkerMouseEnter = () => {
        mapRef.current!.getCanvas().style.cursor = 'pointer'
      }
      const handleMarkerMouseLeave = () => {
        mapRef.current!.getCanvas().style.cursor = ''
      }
      const unclusteredColor = cssStyles.getPropertyValue(
        '--unclustered-marker-color',
      )
      const markerStrokeColor = cssStyles.getPropertyValue(
        '--marker-stroke-color',
      )
      const markerStrokeColorSelected = cssStyles.getPropertyValue(
        '--marker-stroke-color-selected',
      )

      const areUserAssetBoundsValid = areBoundsValid(userAssetBounds)
      if (areUserAssetBoundsValid && zoomToUserAssets) {
        mapRef.current.fitBounds(userAssetBounds, {
          padding: MAPLIBRE_FIT_BOUNDS_PADDING,
          maxZoom: MAPLIBRE_FIT_BOUNDS_MAX_ZOOM,
        })
      }
      if (!areUserAssetBoundsValid && zoomToUserAssets) {
        mapRef.current.setZoom(1)
        mapRef.current.setCenter([0, 0])
      }

      if (userAssetsSource) {
        userAssetsSource.setData(userAssets)
      }

      if (!userAssetsSource) {
        mapRef.current.addSource(MapSourceIds.USER_ASSETS, {
          type: 'geojson',
          data: userAssets,
          promoteId: 'id', // necessary to use for table selection styling via setFeatureState
        })
      }

      if (!userAssetsPointsLayer) {
        mapRef.current.addLayer({
          id: MapLayerIds.USER_ASSETS_POINTS,
          type: 'circle',
          source: MapSourceIds.USER_ASSETS,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': [
              'case',
              ['==', ['feature-state', 'isSelected'], true],
              12.5,
              12,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': [
              'case',
              ['==', ['feature-state', 'isSelected'], true],
              markerStrokeColorSelected,
              markerStrokeColor,
            ],
            'circle-color': unclusteredColor,
          },
        })

        mapRef.current.on(
          'click',
          MapLayerIds.USER_ASSETS_POINTS,
          markerClickHandlerToUse,
        )
        mapRef.current.on(
          'mouseenter',
          MapLayerIds.USER_ASSETS_POINTS,
          handleMarkerMouseEnter,
        )
        mapRef.current.on(
          'mouseleave',
          MapLayerIds.USER_ASSETS_POINTS,
          handleMarkerMouseLeave,
        )
      }

      if (!userAssetsPolygonsFillLayer) {
        mapRef.current.addLayer({
          id: MapLayerIds.USER_ASSETS_POLYGONS_FILL,
          type: 'fill',
          source: MapSourceIds.USER_ASSETS,
          paint: {
            'fill-color': unclusteredColor,
            'fill-opacity': 0.75,
          },
          filter: ['==', '$type', 'Polygon'],
        })

        mapRef.current.on(
          'click',
          MapLayerIds.USER_ASSETS_POLYGONS_FILL,
          markerClickHandlerToUse,
        )
        mapRef.current.on(
          'mouseenter',
          MapLayerIds.USER_ASSETS_POLYGONS_FILL,
          handleMarkerMouseEnter,
        )
        mapRef.current.on(
          'mouseleave',
          MapLayerIds.USER_ASSETS_POLYGONS_FILL,
          handleMarkerMouseLeave,
        )
      }

      if (!userAssetsPolygonsStrokeLayer) {
        mapRef.current.addLayer({
          id: MapLayerIds.USER_ASSETS_POLYGONS_STROKE,
          type: 'line',
          source: MapSourceIds.USER_ASSETS,
          paint: {
            'line-color': [
              'case',
              ['==', ['feature-state', 'isSelected'], true],
              markerStrokeColorSelected,
              markerStrokeColor,
            ],
            'line-width': [
              'case',
              ['==', ['feature-state', 'isSelected'], true],
              3,
              2,
            ],
          },
          filter: ['==', '$type', 'Polygon'],
        })

        mapRef.current.on(
          'click',
          MapLayerIds.USER_ASSETS_LINES,
          markerClickHandlerToUse,
        )
        mapRef.current.on(
          'mouseenter',
          MapLayerIds.USER_ASSETS_LINES,
          handleMarkerMouseEnter,
        )
        mapRef.current.on(
          'mouseleave',
          MapLayerIds.USER_ASSETS_LINES,
          handleMarkerMouseLeave,
        )
      }

      if (!userAssetsLinesLayer) {
        mapRef.current.addLayer({
          id: MapLayerIds.USER_ASSETS_LINES,
          type: 'line',
          source: MapSourceIds.USER_ASSETS,
          paint: {
            'line-color': [
              'case',
              ['==', ['feature-state', 'isSelected'], true],
              markerStrokeColorSelected,
              unclusteredColor,
            ],
            'line-width': [
              'case',
              ['==', ['feature-state', 'isSelected'], true],
              6,
              5,
            ],
          },
          filter: ['==', '$type', 'LineString'],
        })
      }
    },
    [
      isMapLoaded,
      mapRef,
      onAssetMarkerClick,
      onHighlightInTableClick,
      onMapMarkerPopupClose,
      setIsMapLoading,
      zoomToUserAssets,
    ],
  )

  const updateCurrentPortfolioShown = useCallback(
    (id: string) => {
      if (!id) {
        removeUserAssetsFromMap()
        return
      }

      setIsPortfolioLoading(true)

      if (!authenticatedAxios || !workspaceUserName) {
        toast.error(
          'There was an issue with authentication. Try logging in again.',
        )
        setIsPortfolioLoading(false)

        return
      }
      return authenticatedAxios
        .get(getUploadedFileUrl({ workspaceUserName, fileName: id }))
        .then((response) => {
          if (!response) throw new Error('No response')

          updateUserAssetsInMap(response.data as UserAssets)
        })
        .catch(() => {
          toast.error(
            'There was an issue accessing that portfolio. Please try again.',
          )
        })
        .finally(() => {
          setIsPortfolioLoading(false)
        })
    },
    [
      authenticatedAxios,
      removeUserAssetsFromMap,
      updateUserAssetsInMap,
      workspaceUserName,
    ],
  )

  return {
    updateUserAssetsInMap,
    removeUserAssetsFromMap,
    updateCurrentPortfolioShown,
    isPortfolioLoading,
  }
}
