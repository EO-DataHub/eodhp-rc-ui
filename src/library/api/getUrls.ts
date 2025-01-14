const AWS_BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET_NAME

export const getResultsUrl = ({
  workspaceUserName,
  jobId,
}: {
  jobId: string
  workspaceUserName: string
}) =>
  `https://${workspaceUserName}.workspaces.test.eodhp.eco-ke-staging.com/files/${AWS_BUCKET_NAME}/processing-results/cat_${jobId}.json`

export const getCsvResultsUrl = ({
  workspaceUserName,
  jobId,
}: {
  jobId: string
  workspaceUserName: string
}) =>
  `https://${workspaceUserName}.workspaces.test.eodhp.eco-ke-staging.com/files/${AWS_BUCKET_NAME}/processing-results/cat_${jobId}/col_${jobId}/data.csv`

export const getUploadedFileUrl = ({
  workspaceUserName,
  fileName,
}: {
  workspaceUserName: string
  fileName: string
}) =>
  `https://${workspaceUserName}.workspaces.test.eodhp.eco-ke-staging.com/files/${AWS_BUCKET_NAME}/user-assets/${fileName}`
