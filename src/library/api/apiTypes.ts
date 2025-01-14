interface DateInputOptions {
  label: string
  type: 'date'
  default: string
}

export interface HubWorkflowPresetInputs {
  workflow: string
  stac_collection: string
  stac_query?: string
  stac_catalog: string
  extra_args?: string
}

export interface HubWorkflowOptions {
  title: string
  description: string
  constraints: {
    required_columns: string[]
    supported_assets: string[]
  }
  preset_inputs: HubWorkflowPresetInputs
  user_inputs: {
    start_date?: DateInputOptions
    end_date?: DateInputOptions
  }
}
