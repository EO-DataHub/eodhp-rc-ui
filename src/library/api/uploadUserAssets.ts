import { AxiosInstance } from 'axios'
import { UserAssets } from '../userAssets/userAssetTypes'
import { getHubAssetStorageUrlForFile } from './getHubAssetStorageUrls'

export const uploadUserAssets = ({
  authenticatedAxios,
  assets,
  fileName,
  workspaceUserName,
}: {
  authenticatedAxios: AxiosInstance
  assets: UserAssets
  fileName: string
  workspaceUserName: string
}) => {
  const hubStorageUrlForFile = getHubAssetStorageUrlForFile({
    workspaceUserName,
    fileName,
  })

  return authenticatedAxios.put(hubStorageUrlForFile, assets)
}
