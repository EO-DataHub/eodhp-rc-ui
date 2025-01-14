import { AxiosInstance } from 'axios'

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL
const HUB_APP_WORKSPACE_NAME = import.meta.env.VITE_HUB_APP_WORKSPACE_NAME

export const deleteWorkflow = ({
  authenticatedAxios,
  jobId,
}: {
  authenticatedAxios: AxiosInstance
  jobId: string
}) => {
  return authenticatedAxios.delete(
    `${HUB_BASE_URL}/ades/${HUB_APP_WORKSPACE_NAME}/ogc-api/jobs/${jobId}`,
  )
}
