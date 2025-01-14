import { Button, DropdownMenu, Select, Tabs, Text } from '@radix-ui/themes'
import { useContext, useEffect, useMemo, useState } from 'react'

import { HubWorkflowNicknames } from '../../../configuration/constants'

import { PageLayout } from '../../Layout/PageLayout'
import { PageSubtitle } from '../../PageSubtitle'
import { PageTitle } from '../../PageTitle'
import analyticsStyles from './AssetsAnalytics.module.scss'
import formStyles from '../../../library/genericStyles/forms.module.scss'
import containerStyles from '../../../library/genericStyles/containers.module.scss'
import {
  AnalysedOscUserAssetForTable,
  getLstResultsTableData,
  getOscResultsTableData,
} from '../../../library/userAssets/convertUserAssets'
import { AssetsImpacts } from './AssetImpacts/AssetImpacts'
import { UserAssetsContext } from '../../../context/UserAssetsContext'
import { InfoPopover } from '../../InfoPopover/InfoPopover'
import {
  hazardTypePopupContent,
  scenarioPopupContent,
  yearPopupContent,
} from '../../../configuration/infoPopupContentHazards'

export const AssetsAnalytics = () => {
  const [hazardTypeFilterOptions, setHazardTypeFilterOptions] =
    useState<string[]>()
  const [hazardTypeFilterValue, setHazardTypeFilterValue] = useState<string>()
  const [scenarioFilterOptions, setScenarioFilterOptions] = useState<string[]>()
  const [scenarioFilterValue, setScenarioFilterValue] = useState<string>()
  const [yearFilterOptions, setYearFilterOptions] = useState<string[]>()
  const [yearFilterValue, setYearFilterValue] = useState<string>()

  const {
    analysedAssetsWorkflowNickname,
    analysedAssetsWorkflowTitle,
    analysedUserAssets,
    analysedAssetsFileName,
    analysisRunDate,
    csvResults,
  } = useContext(UserAssetsContext)

  useEffect(
    function initializeFiltersForCurrentWorkflow() {
      setHazardTypeFilterOptions(
        analysedAssetsWorkflowNickname === (HubWorkflowNicknames.OSC as string)
          ? ['ChronicHeat']
          : undefined,
      )
    },
    [analysedAssetsWorkflowNickname],
  )

  const downloadFileGeoJson = new Blob([JSON.stringify(analysedUserAssets)], {
    type: 'text/json;charset=utf-8',
  })
  const downloadUrlGeoJson = URL.createObjectURL(downloadFileGeoJson)
  const downloadFileCsv = csvResults
    ? new Blob([csvResults], {
        type: 'text/json;charset=utf-8',
      })
    : undefined
  const downloadUrlCsv = downloadFileCsv
    ? URL.createObjectURL(downloadFileCsv)
    : undefined

  const analysedUserAssetsForTable = useMemo(
    () =>
      analysedAssetsWorkflowNickname === (HubWorkflowNicknames.OSC as string)
        ? getOscResultsTableData(analysedUserAssets)
        : getLstResultsTableData(analysedUserAssets),

    [analysedAssetsWorkflowNickname, analysedUserAssets],
  )
  const filteredAnalysedUserAssetsForTable = useMemo(() => {
    return (
      analysedUserAssetsForTable as AnalysedOscUserAssetForTable[]
    ).filter(
      (asset: AnalysedOscUserAssetForTable) =>
        (yearFilterValue ? asset.year === yearFilterValue : true) &&
        (scenarioFilterValue ? asset.scenario === scenarioFilterValue : true) &&
        (hazardTypeFilterValue
          ? asset.hazardType === hazardTypeFilterValue
          : true),
    )
  }, [
    hazardTypeFilterValue,
    scenarioFilterValue,
    analysedUserAssetsForTable,
    yearFilterValue,
  ])

  useEffect(
    function generateOscFilterOptions() {
      const years: string[] = []
      const scenarios: string[] = []
      const hazardTypes: string[] = []

      const analysedOscUserAssetForTable =
        analysedUserAssetsForTable as AnalysedOscUserAssetForTable[]
      analysedOscUserAssetForTable.forEach(({ year, scenario, hazardType }) => {
        if (year && year.toLowerCase() !== 'none') {
          years.push(year)
        }
        if (scenario && scenario.toLowerCase() !== 'historical') {
          scenarios.push(scenario)
        }
        if (hazardType) {
          hazardTypes.push(hazardType)
        }
      })

      const uniqueYears = [...new Set(years)]
      const uniqueScenarios = [...new Set(scenarios)]
      const uniqueHazardTypes = [...new Set(hazardTypes)]

      setYearFilterOptions(uniqueYears.sort())
      setScenarioFilterOptions(uniqueScenarios.sort())
      setHazardTypeFilterOptions(uniqueHazardTypes.sort())
    },
    [analysedUserAssetsForTable],
  )

  useEffect(
    function initiateYearFilter() {
      if (
        !yearFilterOptions?.length ||
        !setYearFilterValue ||
        !setYearFilterOptions
      )
        return

      setYearFilterValue(yearFilterOptions[0])
    },
    [setYearFilterValue, yearFilterOptions],
  )

  useEffect(
    function initiateScenarioFilter() {
      if (
        !scenarioFilterOptions?.length ||
        !setScenarioFilterValue ||
        !scenarioFilterOptions
      )
        return

      setScenarioFilterValue(scenarioFilterOptions[0])
    },
    [scenarioFilterOptions, setScenarioFilterValue],
  )

  useEffect(
    function initiateIndicatorFilter() {
      if (
        !hazardTypeFilterOptions?.length ||
        !setHazardTypeFilterValue ||
        !hazardTypeFilterOptions
      )
        return

      setHazardTypeFilterValue(hazardTypeFilterOptions[0])
    },
    [hazardTypeFilterOptions, setHazardTypeFilterValue],
  )

  const oscFilters = (
    <>
      {hazardTypeFilterOptions?.length ? (
        <div className={analyticsStyles.filterInputWrapper}>
          <div className={formStyles.labelWithInfoPopoverRow}>
            <label
              htmlFor="hazard-type-filter"
              className={formStyles.formLabel}
            >
              Hazard Type
            </label>
            <InfoPopover>{hazardTypePopupContent}</InfoPopover>
          </div>
          <Select.Root
            value={hazardTypeFilterValue}
            onValueChange={setHazardTypeFilterValue}
          >
            <Select.Trigger id="hazard-type-filter" />
            <Select.Content>
              {hazardTypeFilterOptions?.map((option) => (
                <Select.Item value={option} key={option}>
                  {option}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      ) : null}
      {scenarioFilterOptions?.length ? (
        <div className={analyticsStyles.filterInputWrapper}>
          <div className={formStyles.labelWithInfoPopoverRow}>
            <label htmlFor="scenario-filter" className={formStyles.formLabel}>
              Scenario
            </label>
            <InfoPopover>{scenarioPopupContent}</InfoPopover>
          </div>
          <Select.Root
            value={scenarioFilterValue}
            onValueChange={setScenarioFilterValue}
          >
            <Select.Trigger id="scenario-filter" />
            <Select.Content>
              {scenarioFilterOptions?.map((option) => (
                <Select.Item value={option} key={option}>
                  {option}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      ) : null}

      {yearFilterOptions?.length ? (
        <div className={analyticsStyles.filterInputWrapper}>
          <div className={formStyles.labelWithInfoPopoverRow}>
            <label htmlFor="year-filter" className={formStyles.formLabel}>
              Year
            </label>
            <InfoPopover>{yearPopupContent}</InfoPopover>
          </div>
          <Select.Root
            value={yearFilterValue}
            onValueChange={setYearFilterValue}
          >
            <Select.Trigger id="year-filter" />
            <Select.Content>
              {yearFilterOptions?.map((option) => (
                <Select.Item value={option} key={option}>
                  {option}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      ) : null}
    </>
  )
  const noAnalysisView = (
    <>
      Please run an assets analysis first from the assets page to view analysis
      results.
    </>
  )
  return (
    <>
      <PageLayout>
        <div className={containerStyles.flexRowSpaceBetweenStart}>
          <PageTitle>Analysis</PageTitle>
          {analysedUserAssets ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button>Download Analysis</Button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content
                className={analyticsStyles.downloadMenuContent}
              >
                <DropdownMenu.Item>
                  <a
                    download={`${analysedAssetsFileName}_${analysedAssetsWorkflowTitle}_${analysisRunDate}.geojson`}
                    href={downloadUrlGeoJson}
                  >
                    as GeoJSON
                  </a>
                </DropdownMenu.Item>
                {csvResults ? (
                  <DropdownMenu.Item>
                    <a
                      download={`${analysedAssetsFileName}_${analysedAssetsWorkflowTitle}_${analysisRunDate}.csv`}
                      href={downloadUrlCsv}
                    >
                      as CSV
                    </a>
                  </DropdownMenu.Item>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          ) : null}
        </div>

        {analysedUserAssets ? (
          <>
            <PageSubtitle>
              {analysedAssetsFileName ? (
                <>Portfolio: {analysedAssetsFileName}</>
              ) : null}
              {analysisRunDate && analysedAssetsFileName ? (
                <> | Analysis Run: {analysisRunDate}</>
              ) : null}
              {analysedUserAssets.features.length && analysedAssetsFileName ? (
                <> | Assets: {analysedUserAssets?.features.length}</>
              ) : null}
            </PageSubtitle>
            <Text as="p" className={analyticsStyles.subSubtitle}>
              {analysedAssetsWorkflowTitle ? (
                <> Workflow: {analysedAssetsWorkflowTitle}</>
              ) : null}
            </Text>

            <Tabs.Root
              defaultValue="assetImpacts"
              className={analyticsStyles.tabsRoot}
            >
              <Tabs.List>
                <Tabs.Trigger value="assetImpacts">Asset Impacts</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content
                value="assetImpacts"
                className={analyticsStyles.tabsContent}
              >
                <AssetsImpacts
                  oscFilters={oscFilters}
                  analysedUserAssets={analysedUserAssets}
                  filteredAnalysedUserAssetsForTable={
                    filteredAnalysedUserAssetsForTable
                  }
                />
              </Tabs.Content>
            </Tabs.Root>
          </>
        ) : (
          noAnalysisView
        )}
      </PageLayout>
    </>
  )
}
