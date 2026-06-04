import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Progress, Select, Table, Text, TextField } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { MagnifyingGlassIcon, UploadIcon } from '@radix-ui/react-icons'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceTokens, fetchWorkspaces } from '@/services/workspaceTokenService'
import {
  deleteWorkspaceFile,
  listWorkspaceFiles,
  uploadObjectStoreFilePresigned,
  uploadWorkspaceFiles,
  StoreType,
  WorkspaceFileItem,
  WorkspaceFileListResponse,
} from '@/services/workspaceFilesService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { formatFileDateTime, formatFileSize } from '@/library/fileUtils'
import styles from '../MyDataPage/MyDataPage.module.scss'

export const DataStoragePage: React.FC = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)

  const [searchText, setSearchText] = useState('')
  const [dataWorkspace, setDataWorkspace] = useState<string>(() => {
    const stored = localStorage.getItem('dataStorageSelectedWorkspace')
    return stored ?? currentWorkspace ?? ''
  })
  const [dataStoreFilter, setDataStoreFilter] = useState<'all' | StoreType>('all')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null)

  // Fetch all workspaces to populate dropdown
  const { data: allWorkspaces } = useQuery({
    queryKey: ['Workspaces', token],
    queryFn: () => fetchWorkspaces(token),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  const workspaceOptions = useMemo(() => {
    const workspaceSet = new Set<string>()

    if (allWorkspaces) {
      allWorkspaces.forEach((ws) => {
        if (ws.name) {
          workspaceSet.add(ws.name)
        }
      })
    }

    if (currentWorkspace) {
      workspaceSet.add(currentWorkspace)
    }

    return Array.from(workspaceSet).sort()
  }, [allWorkspaces, currentWorkspace])

  const dataWorkspaceOptions = useMemo(() => {
    return workspaceOptions
  }, [workspaceOptions])

  // Default data workspace if none selected yet
  useEffect(() => {
    if (!dataWorkspace && dataWorkspaceOptions.length > 0) {
      setDataWorkspace(dataWorkspaceOptions[0])
    }
  }, [dataWorkspace, dataWorkspaceOptions])

  // Clear stale upload messages when the workspace or store filter changes
  useEffect(() => {
    setUploadSuccess(null)
    setUploadError(null)
  }, [dataWorkspace, dataStoreFilter])

  const handleDataWorkspaceChange = (workspace: string) => {
    localStorage.setItem('dataStorageSelectedWorkspace', workspace)
    setDataWorkspace(workspace)
  }

  const resolveWorkspaceAccessToken = async (): Promise<string> => {
    if (!token) {
      throw new Error('You must be signed in to access workspace files.')
    }
    if (!dataWorkspace) {
      throw new Error('Select a workspace to access files.')
    }
    const workspaceTokens = await fetchWorkspaceTokens(dataWorkspace, token)
    return workspaceTokens.access
  }

  const storeParam = dataStoreFilter === 'all' ? undefined : dataStoreFilter

  const {
    data: filesResult,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery<WorkspaceFileListResponse>({
    queryKey: ['WorkspaceFiles', dataWorkspace, dataStoreFilter, token],
    queryFn: async () => {
      const accessToken = await resolveWorkspaceAccessToken()
      return listWorkspaceFiles(dataWorkspace, accessToken, storeParam)
    },
    refetchOnWindowFocus: false,
    enabled: Boolean(token && dataWorkspace),
  })

  const filteredFiles = useMemo(() => {
    const items = filesResult?.items ?? []
    const searchLower = searchText.trim().toLowerCase()
    let filtered = items

    if (dataStoreFilter !== 'all') {
      filtered = filtered.filter((item) => item.storeType === dataStoreFilter)
    }
    if (searchLower) {
      filtered = filtered.filter((item) => item.fileName.toLowerCase().includes(searchLower))
    }
    return [...filtered].sort((a, b) => {
      const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0
      const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0
      return dateB - dateA
    })
  }, [filesResult, searchText, dataStoreFilter])

  const canUpload = Boolean(token && dataWorkspace && dataStoreFilter !== 'all')

  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    if (!token) {
      setUploadError('You must be signed in to upload files.')
      return
    }
    if (!dataWorkspace) {
      setUploadError('Select a workspace to upload files.')
      return
    }
    if (dataStoreFilter === 'all') {
      setUploadError('Select a store type to upload files.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const accessToken = await resolveWorkspaceAccessToken()
      if (dataStoreFilter === 'object') {
        for (let i = 0; i < acceptedFiles.length; i++) {
          await uploadObjectStoreFilePresigned(
            dataWorkspace,
            accessToken,
            acceptedFiles[i],
            (fileProgress) => {
              const overall = Math.round(((i + fileProgress / 100) / acceptedFiles.length) * 100)
              setUploadProgress(overall)
            },
          )
        }
      } else {
        await uploadWorkspaceFiles(
          dataWorkspace,
          accessToken,
          dataStoreFilter,
          acceptedFiles,
          (progress) => setUploadProgress(progress),
        )
      }
      setUploadSuccess(
        `Uploaded ${acceptedFiles.length} file${acceptedFiles.length === 1 ? '' : 's'}.`,
      )
      await refetchFiles()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleDeleteFile = async (item: WorkspaceFileItem) => {
    if (!token) {
      setUploadError('You must be signed in to delete files.')
      return
    }
    if (!dataWorkspace) {
      setUploadError('Select a workspace to delete files.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    const deletingKey = `${item.storeType}:${item.fileName}`
    setDeletingFileKey(deletingKey)

    try {
      const accessToken = await resolveWorkspaceAccessToken()
      await deleteWorkspaceFile(dataWorkspace, accessToken, item.storeType, item.fileName)
      setUploadSuccess(`Deleted ${item.fileName}`)
      await refetchFiles()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Delete failed.')
    } finally {
      setDeletingFileKey(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    disabled: !canUpload || isUploading,
  })

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Data storage
        </Text>
        <Text size="3" color="gray">
          Manage files stored in your workspaces
        </Text>
      </Flex>

      <Flex direction="column" gap="5">
        <Flex
          p="5"
          direction="row"
          gap="2"
          align="center"
          justify="between"
          className={styles.filterContainer}
          overflow="auto"
        >
          <Box flexGrow="1" width="200px" flexShrink="0">
            <Select.Root size="3" value={dataWorkspace} onValueChange={handleDataWorkspaceChange}>
              <Select.Trigger style={{ width: '100%' }} placeholder="Workspace" />
              <Select.Content position="popper">
                <Select.Group>
                  {dataWorkspaceOptions.map((workspace) => (
                    <Select.Item key={workspace} value={workspace}>
                      {workspace}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>

          <Box flexGrow="1" width="200px" flexShrink="0">
            <Select.Root
              size="3"
              value={dataStoreFilter}
              onValueChange={(value) => setDataStoreFilter(value as 'all' | StoreType)}
            >
              <Select.Trigger style={{ width: '100%' }} placeholder="Store type" />
              <Select.Content position="popper">
                <Select.Group>
                  <Select.Item value="all">All stores</Select.Item>
                  <Select.Item value="object">Object store</Select.Item>
                  <Select.Item value="block">Block store</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Box>

          <Box flexGrow="1" width="200px" flexShrink="0">
            <TextField.Root
              placeholder="Search files"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="3"
            >
              <TextField.Slot>
                <MagnifyingGlassIcon />
              </TextField.Slot>
            </TextField.Root>
          </Box>
        </Flex>

        {uploadError && <Callout type="error" message={uploadError} />}
        {uploadSuccess && <Callout type="info" message={uploadSuccess} />}

        <Box
          {...getRootProps()}
          className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''} ${
            !canUpload || isUploading ? styles.dropzoneDisabled : ''
          }`}
        >
          <input {...getInputProps()} />
          <Flex direction="column" gap="2" align="center">
            <UploadIcon />
            <Text size="3" weight="medium">
              Drag and drop files here
            </Text>
            <Text size="2" color="gray">
              or click to select files
            </Text>
            {!canUpload && (
              <Text size="2" color="gray">
                Select a workspace and store type to enable uploads.
              </Text>
            )}
          </Flex>
        </Box>

        {isUploading && (
          <Flex direction="column" gap="2">
            <Progress value={uploadProgress ?? 0} />
            <Text size="2" color="gray">
              {uploadProgress ?? 0}%
            </Text>
          </Flex>
        )}

        {!token && <Callout type="info" message="Sign in to view workspace files." />}

        {filesLoading ? (
          <LoadingIndicator size="3" />
        ) : (
          filesError && (
            <Callout
              type="error"
              message={
                filesError instanceof Error ? filesError.message : 'Failed to load workspace files.'
              }
            />
          )
        )}

        {!filesLoading && !filesError && dataWorkspace && (
          <>
            <Flex justify="between" align="center" mb="3">
              <Text size="2" color="gray">
                {filteredFiles.length === 1
                  ? 'Showing 1 file'
                  : `Showing ${filteredFiles.length} files`}
              </Text>
            </Flex>

            {filteredFiles.length === 0 ? (
              <Callout type="info" message="No files found for this workspace." />
            ) : (
              <Table.Root className={`${styles.ordersTable} ${styles.filesTable}`}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell data-column-id="fileName">
                      File name
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell data-column-id="storeType">
                      Store
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell data-column-id="size">Size</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell data-column-id="lastModified">
                      Last modified
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell data-column-id="delete">Delete</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredFiles.map((item: WorkspaceFileItem) => (
                    <Table.Row key={`${item.storeType}-${item.fileName}`}>
                      <Table.Cell data-column-id="fileName">
                        <Text size="2" weight="medium">
                          {item.fileName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell data-column-id="storeType">
                        {item.storeType === 'object' ? 'Object' : 'Block'}
                      </Table.Cell>
                      <Table.Cell data-column-id="size">{formatFileSize(item.size)}</Table.Cell>
                      <Table.Cell data-column-id="lastModified">
                        {formatFileDateTime(item.lastModified)}
                      </Table.Cell>
                      <Table.Cell data-column-id="delete">
                        <Button
                          size="2"
                          variant="soft"
                          color="red"
                          type="button"
                          onClick={() => void handleDeleteFile(item)}
                          disabled={Boolean(
                            deletingFileKey === `${item.storeType}:${item.fileName}`,
                          )}
                          aria-label={`Delete ${item.fileName}`}
                        >
                          Delete
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
