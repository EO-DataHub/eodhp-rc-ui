import React, { useContext, useState } from 'react'
import { Flex, Text, Button, Dialog, TextField, IconButton } from '@radix-ui/themes'
import { CopyIcon } from '@radix-ui/react-icons'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { requestS3Credentials, S3Credentials } from '@/services/s3TokenService'
import { Callout } from '@/components/Callout/Callout'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { formatFileDateTime } from '@/library/fileUtils'
import styles from './S3CredentialsPage.module.scss'

const formatAsEnv = (credentials: S3Credentials) =>
  [
    `AWS_ACCESS_KEY_ID=${credentials.accessKeyId}`,
    `AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}`,
    `AWS_SESSION_TOKEN=${credentials.sessionToken}`,
  ].join('\n')

export const S3CredentialsPage: React.FC = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<S3Credentials | null>(null)

  const handleRequest = async () => {
    if (!token || !currentWorkspace) return

    setRequestError(null)
    setIsRequesting(true)
    try {
      const result = await requestS3Credentials(currentWorkspace, token)
      setCredentials(result)
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to request S3 credentials.')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleCopy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(message)
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <Flex justify="between" align="start">
        <PageHeading
          title="S3 credentials"
          subtitle="Generate temporary AWS S3 credentials for this workspace"
        />
        <Button
          size="3"
          onClick={() => void handleRequest()}
          disabled={!token || !currentWorkspace || isRequesting}
        >
          Request credentials
        </Button>
      </Flex>

      <Flex direction="column" gap="5">
        {!token && <Callout type="info" message="Sign in to request S3 credentials." />}
        {token && !currentWorkspace && (
          <Callout type="info" message="Select a workspace to request S3 credentials." />
        )}
        {requestError && <Callout type="error" message={requestError} />}
      </Flex>

      <Dialog.Root
        open={Boolean(credentials)}
        onOpenChange={(open) => {
          if (!open) setCredentials(null)
        }}
      >
        <Dialog.Content style={{ maxWidth: 520 }}>
          <Dialog.Title>S3 credentials generated</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            This is your only chance to copy these credentials — they will not be shown again.
          </Dialog.Description>

          {credentials && (
            <Flex direction="column" gap="3">
              {(
                [
                  ['Access key ID', credentials.accessKeyId],
                  ['Secret access key', credentials.secretAccessKey],
                  ['Session token', credentials.sessionToken],
                ] as const
              ).map(([label, value]) => (
                <label key={label}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    {label}
                  </Text>
                  <Flex align="center" gap="2">
                    <TextField.Root value={value} readOnly size="3" style={{ flexGrow: 1 }} />
                    <IconButton
                      size="3"
                      variant="soft"
                      aria-label={`Copy ${label}`}
                      onClick={() => void handleCopy(value, 'Copied to clipboard')}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Flex>
                </label>
              ))}
              <Text size="2" color="gray">
                Expires: {formatFileDateTime(credentials.expiration)}
              </Text>
            </Flex>
          )}

          <Flex justify="end" gap="3" mt="4">
            <Button
              variant="soft"
              color="gray"
              onClick={() =>
                credentials && void handleCopy(formatAsEnv(credentials), 'All copied to clipboard')
              }
            >
              Copy all to .env
            </Button>
            <Button onClick={() => setCredentials(null)}>Dismiss</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}
