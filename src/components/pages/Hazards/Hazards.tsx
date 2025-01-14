import { Button, Flex, Heading, Select, Spinner, Tabs } from '@radix-ui/themes'
import { RasterTileSource } from 'maplibre-gl'
import { useContext, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  climateModelPopupContent,
  hazardIndicatorPopupContent,
  hazardTypePopupContent,
  scenarioPopupContent,
  yearPopupContent,
} from '../../../configuration/infoPopupContentHazards'
import {
  climateModelOptions,
  getOptionsByClimateModel,
  indicatorOptions,
  legendParameters,
} from '../../../library/api/fakeApiData'
import { AssetsSelect } from '../../AssetsSelect/AssetsSelect'
import { InfoPopover } from '../../InfoPopover/InfoPopover'
import { InputLabelContainer } from '../../Form/InputLabelContainer'
import { IntervalLegend } from '../../IntervalLegend/IntervalLegend'
import { LoadingContext } from '../../../context/LoadingContext'
import { LoadingIndicator } from '../../LoadingIndicator/LoadingIndicator'
import { Map } from '../../Map/Map'
import {
  HAZARDS_LAYER_INITIAL_OPACITY,
  MapSourceIds,
} from '../../../configuration/constants'
import { PageWithMapLayout } from '../../Layout/PageWithMapLayout'
import { useAssetPortfolios } from '../../../library/userAssets/useAssetPortfolios'
import { useHazardMetadata } from '../../../library/hazards/useHazardMetadata'
import { useMap } from '../../Map/useMap'
import formStyles from '../../../library/genericStyles/forms.module.scss'
import IndicatorDetailsFormatter from './IndicatorDetailsFormatter'
import sidebarStyles from '../../Layout/Sidebar.module.scss'
import { useGetHazardValueByMapClick } from './useGetHazardValueByMapClick'
import { LocationValueOverview } from '../../LocationValueOverview/LocationValueOverview'
import { HazardsPageContext } from '../../../context/HazardsPageContext'
import { RasterLayerOpacityControl } from '../../Map/RasterLayerOpacityControl'

export const Hazards = () => {
  const {
    climateModel,
    hazardIndicator,
    persistedMapCenter,
    persistedMapZoom,
    scenario,
    setClimateModel,
    setHazardIndicator,
    setPersistedMapCenter,
    setPersistedMapZoom,
    setScenario,
    setYear,
    year,
    hazardMarkerValue,
    markerCoordinates,
  } = useContext(HazardsPageContext)

  const { mapContainer, mapRef, isMapLoaded } = useMap({
    center: persistedMapCenter,
    zoom: persistedMapZoom,
    setPersistedMapCenter,
    setPersistedMapZoom,
  })
  const { setIsMapLoading } = useContext(LoadingContext)
  const { updateCurrentPortfolioShown, isPortfolioLoading } =
    useAssetPortfolios({
      mapRef,
      isMapLoaded,
    })

  const { scenarioOptions, yearOptions } =
    getOptionsByClimateModel(climateModel)
  const scenarioLabel = scenarioOptions.find(
    (option) => option.value === scenario,
  )?.label

  const hazardType = 'chronic_heat'
  const navigate = useNavigate()
  const { hazardMetadata, isHazardMetadataError, isHazardMetadataLoading } =
    useHazardMetadata({
      climateModel,
      hazardIndicator,
      hazardType,
      scenario,
      year,
    })

  const hazardIndicatorLabel = indicatorOptions.find(
    (option) => option.value === hazardIndicator,
  )?.label
  const zarrPath = `s3://ukri-eodh-hazard-tiles-us-west-2/hazard/${hazardType}/osc/v2/${hazardIndicator}_${climateModel}_${scenario}_${year}-xarray`

  useGetHazardValueByMapClick({
    isMapLoaded,
    mapRef,
    zarrPath,
  })

  const hazardDetail = isHazardMetadataError ? (
    <>Hazard indicator details are currently unavailable.</>
  ) : (
    <IndicatorDetailsFormatter
      indicatorDetails={hazardMetadata?.properties['osc-hazard:description']}
    />
  )
  const hazardOpacity = useMemo(
    () =>
      Number(
        window
          .getComputedStyle(document.body)
          .getPropertyValue('--hazard-raster-opacity'),
      ),
    [],
  )
  const handleSelectAssetsClick = () => {
    navigate('/assets')
  }

  // this is not scalable, but a temporary solution for the demo
  const legendParametersToUse = hazardIndicator.includes('days_tas_above')
    ? climateModel.includes('uk_')
      ? legendParameters.ukDaysWithAverageTemperatureAbove
      : legendParameters.daysWithAverageTemperatureAbove
    : climateModel.includes('uk_')
      ? legendParameters.ukMeanDegreeDaysAbove
      : legendParameters.meanDegreeDaysAbove

  useEffect(
    function updateHazardMapTiles() {
      if (
        !climateModel ||
        !hazardIndicator ||
        !isMapLoaded ||
        !legendParametersToUse ||
        !mapRef.current ||
        !scenario ||
        !setIsMapLoading ||
        !year
      ) {
        return
      }

      setIsMapLoading(true)

      void mapRef.current.once('idle', () => setIsMapLoading(false))

      const hazardSource = mapRef.current.getSource(
        MapSourceIds.HAZARDS,
      ) as RasterTileSource

      const titilerColormap = JSON.stringify(
        legendParametersToUse.intervals.map((interval, index) => {
          return [
            interval,
            legendParametersToUse.intervalRgbaColor[index].split(','),
          ]
        }),
      )

      const tileUrlToUse = `https://i0h9crgku9.execute-api.us-west-2.amazonaws.com/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?url=${zarrPath}&variable=data&colormap=${titilerColormap}&maxzoom10=`

      if (!hazardSource) {
        mapRef.current.addSource(MapSourceIds.HAZARDS, {
          type: 'raster',
          tiles: [tileUrlToUse],
        })
      }

      if (hazardSource) {
        hazardSource.setTiles([tileUrlToUse])
      }

      const hazardLayer = mapRef.current.getLayer(MapSourceIds.HAZARDS)
      const userAssetsLayer = mapRef.current.getLayer(MapSourceIds.USER_ASSETS)

      const layerIdToLoadObservationsBelow = userAssetsLayer
        ? userAssetsLayer.id
        : undefined

      if (!hazardLayer) {
        mapRef.current.addLayer(
          {
            id: MapSourceIds.HAZARDS,
            type: 'raster',
            source: MapSourceIds.HAZARDS,
            paint: {
              'raster-opacity': hazardOpacity,
            },
          },
          layerIdToLoadObservationsBelow,
        )
      }

      // Add the countries boundaries GeoJSON source if it doesn't exist
      const ukSource = mapRef.current.getSource('uk')
      if (!ukSource) {
        mapRef.current.addSource('uk', {
          type: 'geojson',
          data: './geojson/uk.geojson',
        })
      }

      // Add the countries boundaries layer if it doesn't exist
      const ukLayer = mapRef.current.getLayer('uk-boundaries')
      if (!ukLayer) {
        mapRef.current.addLayer({
          id: 'uk-boundaries',
          type: 'line',
          source: 'uk',
          paint: {
            'line-color': '#000',
            'line-width': 1,
            'line-opacity': 0.3,
          },
        })
      }
    },
    [
      climateModel,
      hazardIndicator,
      hazardOpacity,
      isMapLoaded,
      legendParametersToUse,
      mapRef,
      scenario,
      setIsMapLoading,
      year,
      zarrPath,
    ],
  )

  const sidebarContent = (
    <div className={sidebarStyles.content}>
      <div className={sidebarStyles.contentMidSection}>
        <form className={sidebarStyles.contentForm}>
          <div className={formStyles.multipleInputsRow}>
            <InputLabelContainer>
              <div className={formStyles.labelWithInfoPopoverRow}>
                <label htmlFor="hazard-type">Hazard Type</label>
                <InfoPopover>{hazardTypePopupContent}</InfoPopover>
              </div>

              <Select.Root value={hazardType}>
                <Select.Trigger placeholder="Select" />
                <Select.Content id="hazard-type">
                  <Select.Item value={hazardType}>Chronic Heat</Select.Item>
                </Select.Content>
              </Select.Root>
            </InputLabelContainer>

            <InputLabelContainer>
              <div className={formStyles.labelWithInfoPopoverRow}>
                <label htmlFor="hazard-indicator">Hazard Indicator</label>
                <InfoPopover>{hazardIndicatorPopupContent}</InfoPopover>
              </div>

              <Select.Root
                value={hazardIndicator}
                onValueChange={setHazardIndicator}
              >
                <Select.Trigger placeholder="Select" />
                <Select.Content id="hazard-indicator">
                  {indicatorOptions.map(({ value, label }) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InputLabelContainer>
          </div>

          <div className={formStyles.multipleInputsRow}>
            <InputLabelContainer>
              <div className={formStyles.labelWithInfoPopoverRow}>
                <label htmlFor="climateModel">Climate Model</label>
                <InfoPopover>{climateModelPopupContent}</InfoPopover>
              </div>

              <Select.Root value={climateModel} onValueChange={setClimateModel}>
                <Select.Trigger placeholder="Select" />
                <Select.Content id="climateModel">
                  {climateModelOptions.map(({ value, label }) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InputLabelContainer>
            <InputLabelContainer>
              <div className={formStyles.labelWithInfoPopoverRow}>
                <label htmlFor="scenario">Scenario</label>
                <InfoPopover>{scenarioPopupContent}</InfoPopover>
              </div>
              <Select.Root value={scenario} onValueChange={setScenario}>
                <Select.Trigger placeholder="Select" />
                <Select.Content id="scenario">
                  {scenarioOptions.map(({ value, label }) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InputLabelContainer>
            <InputLabelContainer>
              <div className={formStyles.labelWithInfoPopoverRow}>
                <label htmlFor="year">Year</label>
                <InfoPopover>{yearPopupContent}</InfoPopover>
              </div>
              <Select.Root value={year} onValueChange={setYear}>
                <Select.Trigger placeholder="Select" />
                <Select.Content id="year">
                  {yearOptions.map((year) => (
                    <Select.Item key={year} value={year}>
                      {year}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InputLabelContainer>
          </div>
        </form>

        <Tabs.Root defaultValue="overview" className={sidebarStyles.tabsRoot}>
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="Methodology">Methodology</Tabs.Trigger>
          </Tabs.List>
          <div className={sidebarStyles.tabsContentWrapper}>
            <Tabs.Content value="overview">
              <LocationValueOverview
                isMarkerOnMap={!!markerCoordinates}
                layerLabel={hazardIndicatorLabel}
                locationValue={hazardMarkerValue}
                markerCoordinates={markerCoordinates}
                scenario={scenarioLabel}
                year={year}
              />
            </Tabs.Content>

            <Tabs.Content value="Methodology">
              <Heading size="4" as="h2">
                {hazardIndicatorLabel}
              </Heading>

              {isHazardMetadataLoading ? <LoadingIndicator /> : hazardDetail}
            </Tabs.Content>
          </div>
        </Tabs.Root>

        <div className={sidebarStyles.contentBottomButtonRow}>
          <div className={sidebarStyles.selectAssetsWrapper}>
            <Flex gap="1">
              <label>View Assets on Map</label>{' '}
              {isPortfolioLoading ? <Spinner /> : null}
            </Flex>

            <InputLabelContainer>
              <AssetsSelect onValueChange={updateCurrentPortfolioShown} />
            </InputLabelContainer>
          </div>
          <div className={sidebarStyles.selectAssetsButtonWrapper}>
            <Button onClick={handleSelectAssetsClick}>
              Select Assets for Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const legend = (
    <IntervalLegend
      title={hazardIndicatorLabel}
      legendParameters={legendParametersToUse}
    />
  )

  return (
    <PageWithMapLayout
      map={
        <Map
          mapContainer={mapContainer}
          legend={legend}
          additionalControls={
            <RasterLayerOpacityControl
              initialOpacity={HAZARDS_LAYER_INITIAL_OPACITY}
              isMapLoaded={isMapLoaded}
              layerId={MapSourceIds.HAZARDS}
              mapRef={mapRef}
              sliderLabel="Adjust Hazards Layer Opacity"
            />
          }
        />
      }
      sidebarContent={sidebarContent}
      title="Hazards"
      subtitle="Explore hazard scenarios or analyze assets."
      sidebarWidth="40%"
    />
  )
}
