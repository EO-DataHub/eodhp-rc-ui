import { QuickFilter } from '@/types'

enum DataCategory {
  Climate_Data = 'cat:climate_data',
  Climate_Projections = 'cat:climate_projections',
  Hyperspectral = 'cat:hyperspectral',
  Optical_Multispectral = 'cat:optical_multispectral',
  Radar = 'cat:radar',
  Land_Cover = 'cat:land_cover',
}

enum DataCategoryLabel {
  Climate_Data = 'Climate Data',
  Climate_Projections = 'Climate Projections',
  Hyperspectral = 'Hyperspectral',
  Optical_Multispectral = 'Optical & Multispectral',
  Radar = 'Radar',
  Land_Cover = 'Land Cover',
}

enum Resolution {
  Less_Than_1m = 'res:under_1m',
  From_1m_To_10m = 'res:10m',
  From_10m_To_100m = 'res:100m',
  From_100m_To_1km = 'res:1km',
  From_1km_To_10km = 'res:10km',
  From_10km_To_100km = 'res:100km',
  Greater_Than_100km = 'res:over_100km',
}

enum ResolutionLabel {
  Less_Than_1m = 'Less than 1m',
  From_1m_To_10m = '1m - <10m',
  From_10m_To_100m = '10m - <100m',
  From_100m_To_1km = '100m - <1km',
  From_1km_To_10km = '1km - <10km',
  From_10km_To_100km = '10km - <100km',
  Greater_Than_100km = 'Greater than 100km',
}

enum Provider {
  Airbus = 'pro:airbus',
  CEDA = 'pro:ceda',
  DEFRA = 'pro:defra',
  ESA = 'pro:esa',
  EOCS = 'pro:eocis',
  JNCC = 'pro:jncc',
  Multiple_Contributors = 'pro:multiple_contributors',
  Planet = 'pro:planet',
  UK_Met_Office = 'pro:met_office',
  UOL_LST = 'pro:uol_lst',
  Other = 'pro:other',
}

enum ProviderLabel {
  Airbus = 'Airbus',
  CEDA = 'Centre for Environmental Data Analysis',
  DEFRA = 'Department for Environment, Food & Rural Affairs',
  ESA = 'Earth Observation Climate Information Service',
  EOCS = 'European Space Agency',
  JNCC = 'Joint Nature Conservation Committee',
  Multiple_Contributors = 'Multiple Contributors',
  Planet = 'Planet',
  UK_Met_Office = 'UK Met Office',
  UOL_LST = 'University of Leicester (LST)',
  Other = 'Other',
}

enum Location {
  Global = 'loc:global',
  Continental = 'loc:continental',
  United_Kingdom = 'loc:uk',
}

enum LocationLabel {
  Global = 'Global',
  Continental = 'Continental',
  United_Kingdom = 'United Kingdom',
}

enum Keyword {
  Agriculture_Forestry = 'key:agriculture',
  Climate_Environment = 'key:climate',
  Disaster_Management = 'key:disaster',
  Gas_Emissions_Monitoring = 'key:emissions',
  Habitat_Ecosystem_Mapping = 'key:ecosystem',
  Infrastructure_Urban_Development = 'key:infrastructure',
  Land_Water_Management = 'key:management',
  Marine_Ocean_Science = 'key:ocean',
}

enum KeywordLabel {
  Agriculture_Forestry = 'Agriculture & Forestry',
  Climate_Environment = 'Climate & Environment',
  Disaster_Management = 'Disaster Management',
  Gas_Emissions_Monitoring = 'Gas & Emissions Monitoring',
  Habitat_Ecosystem_Mapping = 'Habitat & Ecosystem Mapping',
  Infrastructure_Urban_Development = 'Infrastructure & Urban Development',
  Land_Water_Management = 'Land & Water Management',
  Marine_Ocean_Science = 'Marine & Ocean Science',
}

enum TimePeriod {
  Historic = 'per:historic',
  Current = 'per:current',
  Forecast = 'per:forecast',
}

enum TimePeriodLabel {
  Historic = 'Historic',
  Current = 'Current',
  Forecast = 'Forecast',
}

enum License {
  Commercial_Data = 'lic:commercial',
  Open_Data = 'lic:open',
}

enum LicenseLabel {
  Commercial_Data = 'Commercial Data',
  Open_Data = 'Open Data',
}

const createOptions = <T extends Record<string, string>>(
  enumObj: T,
  labels: Record<keyof T, string>,
) => Object.entries(enumObj).map(([key, value]) => ({ label: labels[key], value }))

const dataCategories = createOptions(DataCategory, DataCategoryLabel)
const resolutions = createOptions(Resolution, ResolutionLabel)
const providers = createOptions(Provider, ProviderLabel)
const locations = createOptions(Location, LocationLabel)
const keywords = createOptions(Keyword, KeywordLabel)
const timePeriods = createOptions(TimePeriod, TimePeriodLabel)
const licenses = createOptions(License, LicenseLabel)

const collectionCategorization = {
  airbus_spot_data: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.From_1m_To_10m],
    provider: [Provider.Airbus],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  airbus_sar_data: {
    dataCategory: [DataCategory.Radar],
    resolution: [Resolution.From_1m_To_10m],
    provider: [Provider.Airbus],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  airbus_pneo_data: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.Less_Than_1m],
    provider: [Provider.Airbus],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  airbus_phr_data: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.Less_Than_1m],
    provider: [Provider.Airbus],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  airbus_data_example: {
    dataCategory: [],
    resolution: [],
    provider: [],
    location: [],
    keyword: [],
    timePeriod: [],
    license: [],
    additionalFieldsToDisplay: [],
  },
  ukcp: {
    dataCategory: [DataCategory.Climate_Projections],
    resolution: [Resolution.From_10km_To_100km],
    provider: [Provider.UK_Met_Office, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Forecast],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  sentinel2_ard: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.From_10m_To_100m],
    provider: [Provider.DEFRA, Provider.CEDA, Provider.JNCC, Provider.ESA],
    location: [Location.United_Kingdom],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  sentinel1: {
    dataCategory: [DataCategory.Radar],
    resolution: [Resolution.From_10m_To_100m],
    provider: [Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  land_cover: {
    dataCategory: [DataCategory.Land_Cover],
    resolution: [Resolution.From_100m_To_1km],
    provider: [Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-sst-cdrv3': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.UOL_LST, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-lst-s3b-night': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.UOL_LST, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-lst-s3b-day': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.UOL_LST, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-lst-s3a-night': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.UOL_LST, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-lst-s3a-day': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.UOL_LST, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-aerosol-slstr-daily-s3a': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-aerosol-slstr-daily-s3b': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-aerosol-slstr-monthly-s3a': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-aerosol-slstr-monthly-s3n': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  'eocis-sst-cdrv3-climatology': {
    dataCategory: [DataCategory.Climate_Data],
    resolution: [Resolution.From_1km_To_10km],
    provider: [Provider.EOCS, Provider.ESA, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  TanagerScene: {
    dataCategory: [DataCategory.Hyperspectral],
    resolution: [Resolution.From_10m_To_100m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  TanagerMethane: {
    dataCategory: [],
    resolution: [],
    provider: [],
    location: [],
    keyword: [],
    timePeriod: [],
    license: [],
    additionalFieldsToDisplay: [],
  },
  SkySatVideo: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.Less_Than_1m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  SkySatScene: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.Less_Than_1m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  SkySatCollect: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.From_1m_To_10m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  REScene: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.From_1m_To_10m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  REOrthoTile: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.From_1m_To_10m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  PSScene: {
    dataCategory: [DataCategory.Optical_Multispectral],
    resolution: [Resolution.From_1m_To_10m],
    provider: [Provider.Planet],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current],
    license: [License.Commercial_Data],
    additionalFieldsToDisplay: [],
  },
  cordex: {
    dataCategory: [DataCategory.Climate_Projections],
    resolution: [Resolution.From_10km_To_100km],
    provider: [Provider.Multiple_Contributors, Provider.CEDA],
    location: [Location.Continental],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current, TimePeriod.Forecast],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [],
  },
  cmip6: {
    dataCategory: [DataCategory.Climate_Projections],
    resolution: [Resolution.Greater_Than_100km],
    provider: [Provider.Multiple_Contributors, Provider.CEDA],
    location: [Location.Global],
    keyword: [],
    timePeriod: [TimePeriod.Historic, TimePeriod.Current, TimePeriod.Forecast],
    license: [License.Open_Data],
    additionalFieldsToDisplay: [
      'cmip6:variable_long_name',
      'cmip6:frequency',
      'cmip6:source_id',
      'cmip6:experiment_id',
      'cmip6:nominal_resolution',
    ],
  },
}

const filterMapping: Record<keyof QuickFilter, { label: string; value: string }[]> = {
  dataCategory: dataCategories,
  resolution: resolutions,
  provider: providers,
  location: locations,
  timePeriod: timePeriods,
  license: licenses,
}

const isValidCollectionId = (id: string): id is keyof typeof collectionCategorization => {
  return id in collectionCategorization
}

const itemCardFieldsToDisplay = {
  [DataCategory.Climate_Data]: [],
  [DataCategory.Climate_Projections]: [
    'variable_long_name',
    'frequency',
    'scenario',
    'start_datetime',
    'end_datetime',
  ],
  [DataCategory.Hyperspectral]: [],
  [DataCategory.Optical_Multispectral]: [
    'eo:cloud_cover',
    'eo:snow_cover',
    'view:sun_elevation',
    'view:incidence_angle',
  ],
  [DataCategory.Radar]: [
    'mission',
    'sat:orbit_state',
    'sar:polarizations',
    'sar:instrument_mode',
    'sar:observation_direction',
  ],
  [DataCategory.Land_Cover]: [],
}

export {
  dataCategories,
  resolutions,
  providers,
  locations,
  keywords,
  timePeriods,
  licenses,
  collectionCategorization,
  itemCardFieldsToDisplay,
  filterMapping,
  isValidCollectionId,
}
