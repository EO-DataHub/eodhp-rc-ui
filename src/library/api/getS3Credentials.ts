import { AxiosInstance } from 'axios'

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export const getS3Credentials = ({
  authenticatedAxios,
}: {
  authenticatedAxios: AxiosInstance
}) => {
  return authenticatedAxios
    .get(`${HUB_BASE_URL}/api/workspaces/s3/credentials`)
    .then((response) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data
    })
}
