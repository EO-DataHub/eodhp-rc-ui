// This should come from a server somewhere, rather than being hard-coded in the application eventually.
import sentinel1_schema from '@/json-schema-forms/assets/sentinel1.json'
import sentinel2_ard_schema from '@/json-schema-forms/assets/sentinel2_ard.json'
import airbus_sar_schema from '@/json-schema-forms/assets/airbus_sar_data.json'
import airbus_spot_schema from '@/json-schema-forms/assets/airbus_spot_data.json'
import airbus_pneo_schema from '@/json-schema-forms/assets/airbus_pneo_data.json'
import airbus_phr_schema from '@/json-schema-forms/assets/airbus_phr_data.json'

type JSONSchema = Record<string, unknown>

const rjsfCollections: Record<string, JSONSchema> = {
  sentinel1: sentinel1_schema,
  sentinel2_ard: sentinel2_ard_schema,
  airbus_sar_data: airbus_sar_schema,
  airbus_spot_data: airbus_spot_schema,
  airbus_pneo_data: airbus_pneo_schema,
  airbus_phr_data: airbus_phr_schema,
}

export default rjsfCollections
