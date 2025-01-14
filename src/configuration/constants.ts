export enum MapSourceIds {
  HAZARDS = 'hazard',
  OBSERVATIONS = 'observations',
  USER_ASSETS = 'user-assets',
  BASEMAP = 'basemap',
}

export const MAP_MAX_ZOOM = 18
export const OBSERVATIONS_LAYER_INITIAL_OPACITY = 1
export const HAZARDS_LAYER_INITIAL_OPACITY = 1

export enum MapLayerIds {
  USER_ASSETS_POINTS = 'user-assets-points',
  USER_ASSETS_LINES = 'user-assets-lines',
  USER_ASSETS_POLYGONS_FILL = 'user-assets-polygons',
  USER_ASSETS_POLYGONS_STROKE = 'user-assets-polygons-stroke',
}

export const MAPLIBRE_FIT_BOUNDS_PADDING = 100
export const MAPLIBRE_FIT_BOUNDS_MAX_ZOOM = 10

export enum AssetImpactViewOptions {
  LIST = 'list',
  DETAILS = 'details',
}

export enum HubWorkflowNicknames {
  OSC = 'OS-Climate',
  LST = 'LST',
}

export type HubWorkflowNicknamesType = `${HubWorkflowNicknames}`

export const hubWorkflowNames = {
  [HubWorkflowNicknames.OSC]: 'physrisk-filter',
  [HubWorkflowNicknames.LST]: 'lst-filter',
}

export const workflowNickNamesByHubWorkflowName = Object.fromEntries(
  Object.entries(hubWorkflowNames).map(([key, value]) => [value, key]),
)

export const DEFAULT_USER_ASSET_COLUMNS = ['latitude', 'longitude', 'id', '']
