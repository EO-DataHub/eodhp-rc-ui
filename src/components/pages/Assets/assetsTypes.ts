import { HubWorkflowPresetInputs } from '../../../library/api/apiTypes'

export interface HandleAnalyseAssetsProps {
  endDate?: string
  startDate?: string
  hubWorkflowPresetInputs: HubWorkflowPresetInputs | undefined
}
