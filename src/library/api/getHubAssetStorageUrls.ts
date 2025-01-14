const AWS_BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET_NAME

const getHubAssetStorageUrl = ({
  workspaceUserName,
}: {
  workspaceUserName: string
}) =>
  `https://${workspaceUserName}.workspaces.test.eodhp.eco-ke-staging.com/files/${AWS_BUCKET_NAME}/user-assets`

export const getHubAssetStorageUrlForFile = ({
  fileName,
  workspaceUserName,
}: {
  fileName: string
  workspaceUserName: string
}) => `${getHubAssetStorageUrl({ workspaceUserName })}/${fileName}`

export const getRelativeS3PathForAssetFile = ({
  fileName,
  workspaceUserName,
}: {
  fileName: string
  workspaceUserName: string
}) => {
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName
  }
  return `${workspaceUserName}/user-assets/${fileName}`
}
