import { getTokensBaseUrl } from './apiUrlUtils'

const TOKENS_BASE_URL = getTokensBaseUrl()

export interface S3Credentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: string
}

export const requestS3Credentials = async (
  workspaceId: string,
  token: string,
): Promise<S3Credentials> => {
  const response = await fetch(`${TOKENS_BASE_URL}/api/workspaces/${workspaceId}/me/s3-tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to request S3 credentials')
  }

  const data = await response.json()
  return data as S3Credentials
}
