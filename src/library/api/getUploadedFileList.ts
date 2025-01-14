import { AxiosInstance } from 'axios'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getS3Credentials } from './getS3Credentials'
import { getFilenameFromAwsFileKey } from './getFilenameFromAwsFileKey'

const AWS_BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET_NAME
const AWS_REGION = import.meta.env.VITE_AWS_REGION

export interface UploadedFileInfo {
  name: string
  dateAdded: Date
  key: string
}

export const getUploadedFileList = ({
  authenticatedAxios,
  workspaceUserName,
}: {
  authenticatedAxios: AxiosInstance
  workspaceUserName: string
}) => {
  return getS3Credentials({ authenticatedAxios })
    .then((credentials) => {
      const { accessKeyId, secretAccessKey, sessionToken } = credentials
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: { accessKeyId, secretAccessKey, sessionToken },
      })
      const command = new ListObjectsV2Command({
        Bucket: AWS_BUCKET_NAME,
        Prefix: `${workspaceUserName}/user-assets`,
      })
      return s3Client.send(command)
    })
    .then((response) => {
      return response.Contents?.map(({ Key, LastModified }) => ({
        name: getFilenameFromAwsFileKey({ key: Key, workspaceUserName }),
        dateAdded: new Date(LastModified!),
      })).filter((item) => item.name !== '') as UploadedFileInfo[]
    })
}
