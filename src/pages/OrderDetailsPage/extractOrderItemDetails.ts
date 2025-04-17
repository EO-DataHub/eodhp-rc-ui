import { MetadataItem } from '@/types'
import { formatDateToMMDDYEAR } from '@/library/dateUtils'

const PLANET_FIELDS = [
  'datetime',
  'provider',
  'pixel_resolution',
  'gsd',
  'visible_percent',
  'clear_percent',
  'cloud_percent',
  'heavy_haze_percent',
  'light_haze_percent',
  'shadow_percent',
  'snow_ice_percent',
  'sun_azimuth',
  'sun_elevation',
  'view_angle',
  'satellite_azimuth',
  'quality_category',
]
interface DateRange {
  Start: string
  End: string
}

interface ViewGeometry {
  Azimuth: string
  'Sun Azimuth': string
  'Sun Elevation': string
  'Incidence Angle': string
}

interface OrbitData {
  State: string
  'Relative Orbit': string
  'Absolute Orbit': string
}

interface OpticalOrderItem {
  'Area Calculation': string | null
  'Date Range': string
  'Data Source': string
  'Item Type': string
  'Cloud Cover': string
  'View Geometry': ViewGeometry
  'Stereo/Mono/Tri-Stereo': string
}

interface SAROrderItem {
  'Area Calculation': string | null
  'Date Range': DateRange
  'Data Source': string
  Mode: string
  Product: string
  Datastacks: string
  'Incident Angle': {
    Min: number | string
    Max: number | string
  }
  Polarization: string
  Path: string
  Look: string
  Orbit: OrbitData
}

interface IncidenceAngle {
  minimum: number
  maximum: number
}

// this stops ts from complaining about missing min/max value type
function isIncidenceAngle(value: unknown): value is IncidenceAngle {
  return (
    !!value &&
    typeof value === 'object' &&
    'minimum' in value &&
    'maximum' in value &&
    typeof (value as IncidenceAngle).minimum === 'number' &&
    typeof (value as IncidenceAngle).maximum === 'number'
  )
}

export const extractOpticalOrderItemDetails = (metadata: MetadataItem[]): OpticalOrderItem => {
  const meta = Object.fromEntries(metadata.map((m) => [m.extension, m.properties ?? {}]))

  return {
    'Area Calculation': '', // 🚨 Not available
    'Date Range': meta['']?.datetime?.formatted ?? 'N/A',
    'Data Source': meta['']?.organisation_name?.formatted ?? 'N/A',
    'Item Type': meta['']?.product_type?.formatted ?? 'N/A',
    'Cloud Cover': meta.eo?.['eo:cloud_cover']?.formatted ?? 'N/A',
    'View Geometry': {
      Azimuth: meta.view?.['view:azimuth']?.formatted ?? 'N/A',
      'Sun Azimuth': meta.view?.['view:sun_azimuth']?.formatted ?? 'N/A',
      'Sun Elevation': meta.view?.['view:sun_elevation']?.formatted ?? 'N/A',
      'Incidence Angle': meta.view?.['view:incidence_angle']?.formatted ?? 'N/A',
    },
    'Stereo/Mono/Tri-Stereo': meta['']?.product_type?.formatted ?? 'N/A', // clarify this
  }
}

export const extractSAROrderItemDetails = (metadata: MetadataItem[]): SAROrderItem => {
  const meta = Object.fromEntries(metadata.map((m) => [m.extension, m.properties ?? {}]))

  return {
    'Area Calculation': `N/A`, // 🚨 Not available
    'Date Range': {
      Start: meta['']?.start_datetime?.formatted ?? 'N/A',
      End: meta['']?.end_datetime?.formatted ?? 'N/A',
    },
    'Data Source': meta['']?.mission?.formatted ?? 'N/A',
    Mode: meta.sar?.['sar:instrument_mode']?.formatted ?? 'N/A',
    Product: meta['']?.acquisition_id?.formatted ?? 'N/A',
    Datastacks: meta['']?.beam_id?.formatted ?? 'N/A',
    'Incident Angle': isIncidenceAngle(meta['']?.incidence_angle?.value)
      ? {
          Min: meta['']?.incidence_angle.value.minimum,
          Max: meta['']?.incidence_angle.value.maximum,
        }
      : {
          Min: 'N/A',
          Max: 'N/A',
        },
    Polarization: meta.sar?.['sar:polarizations']?.formatted ?? 'N/A',
    Path: meta.sar?.['sar:observation_direction']?.formatted ?? 'N/A',
    Look: meta['']?.antenna_mode?.formatted ?? 'N/A',
    Orbit: {
      State: meta.sat?.['sat:orbit_state']?.formatted ?? 'N/A',
      'Relative Orbit': meta.sat?.['sat:relative_orbit']?.formatted ?? 'N/A',
      'Absolute Orbit': meta.sat?.['sat:absolute_orbit']?.formatted ?? 'N/A',
    },
  }
}

export const extractPlanetOrderItemDetails = (
  properties: Record<string, string | number | boolean | null>,
): Record<string, string | number> => {
  const selected: Record<string, string | number> = {}

  PLANET_FIELDS.forEach((key) => {
    const value = properties?.[key]
    if (value !== undefined && value !== null) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

      if (key === 'datetime' && (typeof value === 'string' || typeof value === 'number')) {
        selected[label] = formatDateToMMDDYEAR(value)
      } else {
        selected[label] = typeof value === 'boolean' ? String(value) : value
      }
    }
  })

  return selected
}
