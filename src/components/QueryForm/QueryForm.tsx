import * as buffer from 'buffer'
import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import Form, { IChangeEvent } from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { buildQuery } from '@/json-schema-forms/queries/cql2.ts'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import { Button } from '@radix-ui/themes'
import styles from './QueryForm.module.scss'

// Schema imports
import uiSchema from '@/json-schema-forms/assets/form-ui.json'
import eodh_default_schema from '@/json-schema-forms/assets/schemas/eodh/v1.0.0/form_schema.json'
import sar_v100_schema from '@/json-schema-forms/assets/schemas/sar/v1.0.0/form_schema.json'
import sat_v100_schema from '@/json-schema-forms/assets/schemas/sat/v1.0.0/form_schema.json'
import eo_v110_schema from '@/json-schema-forms/assets/schemas/eo/v1.1.0/form_schema.json'
import eo_v200_schema from '@/json-schema-forms/assets/schemas/eo/v2.0.0/form_schema.json'
import view_v100_schema from '@/json-schema-forms/assets/schemas/view/v1.0.0/form_schema.json'
import cmip6_v100_schema from '@/json-schema-forms/assets/schemas/cmip6/v1.0.0/form_schema.json'
import { CustomSelectWidget } from './widgets/CustomSelectWidget'
import { CustomRangeWidget } from './widgets/CustomRangeWidget'
import { CustomDateWidget } from './widgets/CustomDateWidget'
import { CustomTextWidget } from './widgets/CustomTextWidget'

interface QueryFormProps {
  schema: Record<string, unknown>
  onSubmit: (query: object) => void
  onReset?: boolean
}

interface InMemoryResolver {
  order: number
  canRead: (file: { url: string }) => boolean
  read: (file: { url: string }) => unknown
}

type JSONSchema = Record<string, unknown>

const extensions: Record<string, JSONSchema> = {
  'https://test.eodatahub.org/schemas/eodh/v1.0.0/form_schema.json': eodh_default_schema,
  'https://test.eodatahub.org/schemas/sar/v1.0.0/form_schema.json': sar_v100_schema,
  'https://test.eodatahub.org/schemas/sat/v1.0.0/form_schema.json': sat_v100_schema,
  'https://test.eodatahub.org/schemas/eo/v1.1.0/form_schema.json': eo_v110_schema,
  'https://test.eodatahub.org/schemas/eo/v2.0.0/form_schema.json': eo_v200_schema,
  'https://test.eodatahub.org/schemas/view/v1.0.0/form_schema.json': view_v100_schema,
  'https://test.eodatahub.org/schemas/cmip6/v1.0.0/form_schema.json': cmip6_v100_schema,
}

const inMemoryResolver: InMemoryResolver = {
  order: 1,
  canRead: (file) => file.url in extensions,
  read: (file) => extensions[file.url],
}

async function buildSchema(schema: JSONSchema): Promise<JSONSchema> {
  await $RefParser.dereference(schema, {
    resolve: { file: false, http: false, memory: inMemoryResolver },
  })
  return schema
}

export interface QueryFormRef {
  resetForm: () => void
}

export const QueryForm = forwardRef<QueryFormRef, QueryFormProps>(({ schema, onSubmit }, ref) => {
  const [dereferencedSchema, setDereferencedSchema] = useState<JSONSchema>({})
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const formRef = useRef<Form<Record<string, unknown>>>(null)

  // Ensure that Buffer is available in the browser
  if (!window.Buffer) {
    window.Buffer = buffer.Buffer
  }

  const widgets = {
    SelectWidget: CustomSelectWidget,
    RangeWidget: CustomRangeWidget,
    DateWidget: CustomDateWidget,
    TextWidget: CustomTextWidget,
  }

  useEffect(() => {
    buildSchema(schema)
      .then((result) => {
        setDereferencedSchema(result)
      })
      .catch(() => {
        setDereferencedSchema({})
      })
  }, [schema])

  useImperativeHandle(ref, () => ({
    resetForm: () => {
      setFormData({})
      formRef.current?.reset()
    },
  }))

  return (
    <Form
      ref={formRef}
      className={styles.reactJsonSchemaForm}
      schema={dereferencedSchema}
      formData={formData}
      uiSchema={uiSchema}
      widgets={widgets}
      validator={validator}
      onSubmit={(d: IChangeEvent) => {
        onSubmit(buildQuery(d.schema as JSONSchema, d.formData))
      }}
    >
      <Button type="submit" variant="solid" className={styles.reactJsonSchemaFormButton}>
        Apply
      </Button>
    </Form>
  )
})

QueryForm.displayName = 'QueryForm'
