import { Feature, Geometry, Point } from 'geojson'
import { UserAssets, UserAssetsProperties } from './userAssetTypes'
import { getIsFeaturePoint } from '../geoJson/getIsFeaturePoint'

export interface UserAssetForTable extends UserAssetsProperties {
  latitude: number | 'Not Applicable'
  longitude: number | 'Not Applicable'
}

export interface AnalysedOscUserAssetForTable extends UserAssetForTable {
  year?: string
  scenario?: string
  hazardType?: string
}

const getCoordinatesToUseForTable = (feature: Feature) => {
  const isPoint = getIsFeaturePoint(feature)
  return {
    latitude: isPoint
      ? (feature.geometry as Point).coordinates[1]
      : 'Not Applicable',
    longitude: isPoint
      ? (feature.geometry as Point).coordinates[0]
      : 'Not Applicable',
  }
}
export const convertSimpleGeoJSONToDataForTable = (
  userAssets?: UserAssets,
): UserAssetForTable[] => {
  if (!userAssets) return []

  return userAssets.features?.map((feature) => {
    return {
      ...getCoordinatesToUseForTable(feature),
      ...feature.properties,
    } as UserAssetForTable
  })
}

export const flattenOscRootFeatureProperty = ({
  feature,
  rootLevelPropertyName,
}: {
  feature: Feature<Geometry, UserAssetsProperties>
  rootLevelPropertyName: string
}) => {
  // @ts-expect-error - results schema subject to change. Skipping typing for now.
  const rootLevelFeatureProperty = feature[rootLevelPropertyName]
  const { id } = feature.properties
  const hazardTypes = Object.keys(rootLevelFeatureProperty)
  return hazardTypes
    .map((hazardType) => {
      const scenarioLevelinformation = rootLevelFeatureProperty[hazardType]

      const scenarioNames = Object.keys(scenarioLevelinformation)

      return scenarioNames
        .map((scenario) => {
          const yearLevelInformation = scenarioLevelinformation[scenario]
          const yearNames = Object.keys(yearLevelInformation)
          const indicatorInformationWithYearAndScenario = yearNames.map(
            (year) => {
              const {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                impact_distribution,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                impact_exceedance,
                ...restOfProperties
              } = yearLevelInformation[year] as Record<string, number>

              return {
                id,
                year,
                scenario,
                hazardType,
                ...getCoordinatesToUseForTable(feature),
                ...restOfProperties,
              }
            },
          )

          return indicatorInformationWithYearAndScenario
        })
        .flat()
    })
    .flat()
}

export const getOscResultsTableData = (
  analysedUserAssets: UserAssets | undefined,
) => {
  if (!analysedUserAssets) return []

  const featuresWithFlattenedRiskMeasures = analysedUserAssets.features
    ?.map((feature) => {
      return flattenOscRootFeatureProperty({
        feature,
        rootLevelPropertyName: 'asset_impacts',
      })
    })
    .flat()

  return featuresWithFlattenedRiskMeasures as unknown as AnalysedOscUserAssetForTable[]
}

export const getLstResultsTableData = (
  analysedUserAssets: UserAssets | undefined,
) => {
  if (!analysedUserAssets) return []

  return analysedUserAssets.features?.map((feature) => {
    const { returned_values, ...restOfProperties } = feature.properties

    const simplifiedReturnedValues: { [s: string]: number } = {}

    Object.entries(
      returned_values as { [s: string]: { value: number } },
    ).forEach(([key, value]) => {
      simplifiedReturnedValues[key] = value.value
    })

    return {
      ...getCoordinatesToUseForTable(feature),
      ...restOfProperties,
      ...(simplifiedReturnedValues as object),
    }
  })
}
