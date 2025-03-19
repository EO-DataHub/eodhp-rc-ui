// This should come from a server somewhere, rather than being hard-coded in the application eventually.
import sentinel1_schema from '@/json-schema-forms/assets/sentinel1.json'
import sentinel2_ard_schema from '@/json-schema-forms/assets/sentinel2_ard.json'
import airbus_sar_schema from '@/json-schema-forms/assets/airbus_sar_data.json'
import airbus_spot_schema from '@/json-schema-forms/assets/airbus_spot_data.json'
import airbus_pneo_schema from '@/json-schema-forms/assets/airbus_pneo_data.json'
import airbus_phr_schema from '@/json-schema-forms/assets/airbus_phr_data.json'
import planet_psscene_schema from '@/json-schema-forms/assets/planet_psscene.json'
import planet_reorthotile_schema from '@/json-schema-forms/assets/planet_reorthotile.json'
import planet_rescene_schema from '@/json-schema-forms/assets/planet_rescene.json'
import planet_skysatscene_schema from '@/json-schema-forms/assets/planet_skysatscene.json'
import planet_skysatcollection_schema from '@/json-schema-forms/assets/planet_skysatcollect.json'
import cmip6_schema from '@/json-schema-forms/assets/cmip6.json'

type JSONSchema = Record<string, unknown>

const rjsfCollections: Record<string, JSONSchema> = {
  sentinel1: sentinel1_schema,
  sentinel2_ard: sentinel2_ard_schema,
  airbus_sar_data: airbus_sar_schema,
  airbus_spot_data: airbus_spot_schema,
  airbus_pneo_data: airbus_pneo_schema,
  airbus_phr_data: airbus_phr_schema,
  PSScene: planet_psscene_schema,
  REOrthoTile: planet_reorthotile_schema,
  REScene: planet_rescene_schema,
  SkySatScene: planet_skysatscene_schema,
  SkySatCollect: planet_skysatcollection_schema,
  cmip6: cmip6_schema,
}

export default rjsfCollections
