// @ts-expect-error - no types available
import { csv2geojson as getGeojsonFromCsv } from 'csv2geojson'
import { FeatureCollection, GeoJsonProperties, Point } from 'geojson'
import { toast } from 'react-toastify'

import { getIsFileCsv, getIsFileGeoJson } from '../fileTypes'
import { getObjectKeyNameFromCaseInsensitiveKeyName } from '../objects/getObjectKeyNameFromCaseInsensitiveKeyName'
import { UserAssets } from './userAssetTypes'

const getGeoJsonWithPropertyIdStoredOnLowercaseIdProperty = (
  geoJson: FeatureCollection<Point>,
) => {
  return {
    ...geoJson,
    features: geoJson.features.map((feature) => {
      const actualIdKeyName = getObjectKeyNameFromCaseInsensitiveKeyName({
        searchObject: feature.properties ?? {},
        key: 'id',
      })

      const newProperties: { [key: string]: unknown } = {
        ...feature.properties,
        id: feature.properties?.[actualIdKeyName ?? 'ID'],
      }

      if (actualIdKeyName && actualIdKeyName !== 'id') {
        delete newProperties[actualIdKeyName]
      }

      return {
        ...feature,
        properties: newProperties,
      }
    }),
  }
}

export const parseUploadedAssetsIntoGeoJson = (uploadedFile: File) => {
  return new Promise<UserAssets>((resolve, reject) => {
    const isCsv = getIsFileCsv(uploadedFile)
    const isGeoJson = getIsFileGeoJson(uploadedFile)

    if (!isGeoJson && !isCsv) {
      toast.error('File upload is limited to CSV and GeoJSON file types.')
      reject('Unsupported file type')
    }

    const fileReader = new FileReader()

    fileReader.onload = function () {
      const fileContents = fileReader.result as string
      if (typeof fileContents !== 'string' || !fileContents) {
        reject('Error reading file contents')
      }

      if (isGeoJson) {
        try {
          const parsedFileContents = JSON.parse(fileContents)
          const reformattedParsedFileContents =
            getGeoJsonWithPropertyIdStoredOnLowercaseIdProperty(
              parsedFileContents,
            )

          resolve(reformattedParsedFileContents as UserAssets)
        } catch (error) {
          reject(error)
        }
      }
      if (isCsv) {
        const fileContentsWithCarriageReturnRemoved = fileContents.replace(
          '\r',
          '',
        )
        const headers = fileContentsWithCarriageReturnRemoved
          ?.slice(0, fileContentsWithCarriageReturnRemoved?.indexOf('\n'))
          .split(',')

        const lowerCaseHeaders = headers.map((header) => header.toLowerCase())

        if (
          !lowerCaseHeaders.includes('id') ||
          !lowerCaseHeaders.includes('latitude') ||
          !lowerCaseHeaders.includes('longitude')
        ) {
          toast.error(
            'CSV file must contain "id","latitude", and "longitude" fields. These fields are case insensitive.',
          )
          reject("CSV file must contain 'id','latitude', and 'longitude'")
        }

        const latfield = headers[lowerCaseHeaders.indexOf('latitude')]
        const lonfield = headers[lowerCaseHeaders.indexOf('longitude')]

        getGeojsonFromCsv(
          fileContentsWithCarriageReturnRemoved,
          {
            latfield,
            lonfield,
            delimiter: ',',
          },
          function (error: Error | null, data: FeatureCollection | null) {
            if (!data || error) {
              reject(error)
            }

            resolve(
              getGeoJsonWithPropertyIdStoredOnLowercaseIdProperty(
                data as FeatureCollection<Point, GeoJsonProperties>,
              ) as UserAssets,
            )
          },
        ) as UserAssets
      }
    }

    fileReader.readAsText(uploadedFile)
  })
}
