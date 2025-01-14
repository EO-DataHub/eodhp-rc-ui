import { AxiosError, AxiosInstance } from 'axios'

import { AnalysedUserAssets } from './userAssetTypes'
import { getRelativeS3PathForAssetFile } from '../api/getHubAssetStorageUrls'
import { getResultsUrl } from '../api/getUrls'
import { HubWorkflowPresetInputs } from '../api/apiTypes'

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL
const HUB_APP_WORKSPACE_NAME = import.meta.env.VITE_HUB_APP_WORKSPACE_NAME

const initiateAssetsRiskAnalysis = async ({
  authToken,
  axios,
  workspaceUserName,
  endDate,
  fileName,
  hubWorkflowPresetInputs,
  areUserAssetsASamplePortfolio,
  startDate,
}: {
  authToken: string
  axios: AxiosInstance
  workspaceUserName: string
  endDate?: string
  fileName: string
  hubWorkflowPresetInputs: HubWorkflowPresetInputs | undefined
  areUserAssetsASamplePortfolio: boolean
  startDate?: string
}) => {
  const inputsFromConfigurationsToUse = {
    stac_catalog: hubWorkflowPresetInputs?.stac_catalog,
    stac_collection: hubWorkflowPresetInputs?.stac_collection,
    stac_query: hubWorkflowPresetInputs?.stac_query,
    extra_args: hubWorkflowPresetInputs?.extra_args,
  }
  return axios.post(
    `${HUB_BASE_URL}/ades/${HUB_APP_WORKSPACE_NAME}/ogc-api/processes/${hubWorkflowPresetInputs?.workflow}/execution`,
    {
      inputs: {
        ...inputsFromConfigurationsToUse,
        assets: getRelativeS3PathForAssetFile({
          workspaceUserName: areUserAssetsASamplePortfolio
            ? HUB_APP_WORKSPACE_NAME
            : workspaceUserName,
          fileName,
        }),
        end_date: endDate,
        start_date: startDate,
        token: authToken,
      },
    },
    {
      headers: { prefer: 'respond-async' },
    },
  )
}

const getIsDataReady = (status: string) => {
  if (status === 'running') {
    return false
  } else if (status === 'successful') {
    return true
  } else {
    throw new Error('Failed to get status')
  }
}

const getData = async ({
  axios,
  jobId,
  workspaceUserName,
}: {
  axios: AxiosInstance
  jobId: string
  workspaceUserName: string
}) => {
  const resultsUrl = getResultsUrl({ jobId, workspaceUserName })
  return axios.get(resultsUrl).then((response) => {
    return response.data.data as AnalysedUserAssets
  })
}

async function getAssetsRiskResults({
  axios,
  url,
  workspaceUserName,
}: {
  axios: AxiosInstance
  url: string
  workspaceUserName: string
}) {
  const pollForAnalysisResults = async (
    resolve: (result: {
      analysedData: AnalysedUserAssets
      jobId: string
    }) => void,
    reject: (error: unknown) => void,
  ) => {
    try {
      const {
        data: { status, jobID: jobId },
      } = await axios.get(url)
      const isDataReady = getIsDataReady(status)
      if (isDataReady) {
        const data = await getData({
          axios,
          jobId,
          workspaceUserName,
        })

        resolve({ analysedData: data, jobId })
      } else {
        setTimeout(() => {
          void pollForAnalysisResults(resolve, reject)
        }, 10000)
      }
    } catch (error) {
      if (
        error instanceof AxiosError &&
        error.response?.data.title === 'NoSuchJob'
      ) {
        return // analysis was  deleted/cancelled
      }
      reject(error)
    }
  }

  return new Promise(pollForAnalysisResults)
}

export const analyseAssets = ({
  authToken,
  axios,
  workspaceUserName,
  endDate,
  fileName,
  hubWorkflowPresetInputs,
  areUserAssetsASamplePortfolio,
  startDate,
}: {
  authToken: string
  axios?: AxiosInstance
  workspaceUserName: string
  endDate?: string
  fileName: string
  hubWorkflowPresetInputs: HubWorkflowPresetInputs | undefined
  areUserAssetsASamplePortfolio: boolean
  startDate?: string
}) => {
  if (!axios) {
    throw new Error('axios is required')
  }
  if (!workspaceUserName) {
    throw new Error('The user must be logged in and have a username')
  }

  return initiateAssetsRiskAnalysis({
    authToken,
    axios,
    workspaceUserName,
    endDate,
    fileName,
    hubWorkflowPresetInputs,
    areUserAssetsASamplePortfolio,
    startDate,
  }).then((response) => {
    const statusPollingUrl = response.data.links.find(
      (link: { title: string }) => link.title === 'Status location',
    ).href

    return getAssetsRiskResults({
      axios,
      url: statusPollingUrl,
      workspaceUserName,
    })
  })
}
