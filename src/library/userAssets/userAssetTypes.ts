import { FeatureCollection, Geometry } from 'geojson'

export type RowSelection = Record<string | number, boolean>
export interface UserAssetsProperties {
  id: string | number
  type: string
  location: string
  asset_class: string
  [x: string]: unknown
}

export type UserAssets = FeatureCollection<
  Geometry,
  UserAssetsProperties
> | null
export type AnalysedUserAssets = FeatureCollection<
  Geometry,
  UserAssetsProperties //the schema between workflows is variable, so we dont really have a type for this yet
> | null

export type parseUploadedAssetsIntoGeoJson = (
  uploadedFile: File,
) => Promise<UserAssets>
