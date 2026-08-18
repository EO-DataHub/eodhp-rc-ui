import React, { useContext, useEffect, useMemo, useState } from 'react'
import {
  AlertDialog,
  Box,
  Button,
  Checkbox,
  Flex,
  Progress,
  Select,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useDebounce } from 'use-debounce'
import {
  CaretDownIcon,
  CaretSortIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  UploadIcon,
} from '@radix-ui/react-icons'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
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
import { MockVisibilitySelect } from '@/components/MockVisibilitySelect/MockVisibilitySelect'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { formatFileDateTime, formatFileSize } from '@/library/fileUtils'
import styles from '../MyDataPage/MyDataPage.module.scss'

const FILES_PAGE_SIZE = 50

type SortColumn = 'fileName' | 'storeType' | 'size' | 'lastModified'

const getFileKey = (item: WorkspaceFileItem) => `${item.storeType}:${item.fileName}`

export const DataStoragePage: React.FC = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)

  const [searchText, setSearchText] = useState('')
  const [dataStoreFilter, setDataStoreFilter] = useState<'all' | StoreType>('all')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('lastModified')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [debouncedSearchText] = useDebounce(searchText, 300)

  // Clear stale upload messages and selection when the workspace or store filter changes
  useEffect(() => {
    setUploadSuccess(null)
    setUploadError(null)
    setSelectedKeys(new Set())
  }, [currentWorkspace, dataStoreFilter])

  // Reset to the first page whenever the filtered/sorted result set changes
  useEffect(() => {
    setCurrentPage(0)
  }, [currentWorkspace, dataStoreFilter, debouncedSearchText, sortColumn, sortDirection])

  const resolveWorkspaceAccessToken = async (): Promise<string> => {
    if (!token) {
      throw new Error('You must be signed in to access workspace files.')
    }
    if (!currentWorkspace) {
      throw new Error('Select a workspace to access files.')
    }
    const workspaceTokens = await fetchWorkspaceTokens(currentWorkspace, token)
    return workspaceTokens.access
  }

  const storeParam = dataStoreFilter === 'all' ? undefined : dataStoreFilter

  const {
    data: filesResult,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery<WorkspaceFileListResponse>({
    queryKey: ['WorkspaceFiles', currentWorkspace, dataStoreFilter, token],
    queryFn: async () => {
      const accessToken = await resolveWorkspaceAccessToken()
      return listWorkspaceFiles(currentWorkspace!, accessToken, storeParam)
    },
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  const filteredFiles = useMemo(() => {
    const items = filesResult?.items ?? []
    const searchLower = debouncedSearchText.trim().toLowerCase()
    let filtered = items

    if (dataStoreFilter !== 'all') {
      filtered = filtered.filter((item) => item.storeType === dataStoreFilter)
    }
    if (searchLower) {
      filtered = filtered.filter((item) => item.fileName.toLowerCase().includes(searchLower))
    }
    return [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'fileName':
          comparison = a.fileName.localeCompare(b.fileName)
          break
        case 'storeType':
          comparison = a.storeType.localeCompare(b.storeType)
          break
        case 'size':
          comparison = (a.size ?? 0) - (b.size ?? 0)
          break
        case 'lastModified': {
          const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0
          const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0
          comparison = dateA - dateB
          break
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filesResult, debouncedSearchText, dataStoreFilter, sortColumn, sortDirection])

  const pageCount = Math.ceil(filteredFiles.length / FILES_PAGE_SIZE)
  const paginatedFiles = useMemo(() => {
    const startIndex = currentPage * FILES_PAGE_SIZE
    return filteredFiles.slice(startIndex, startIndex + FILES_PAGE_SIZE)
  }, [filteredFiles, currentPage])

  // Guard against a stranded empty page after items are removed (e.g. batch delete)
  useEffect(() => {
    if (currentPage > 0 && currentPage >= pageCount) {
      setCurrentPage(Math.max(0, pageCount - 1))
    }
  }, [pageCount, currentPage])

  const selectedItemsInView = useMemo(
    () => filteredFiles.filter((item) => selectedKeys.has(getFileKey(item))),
    [filteredFiles, selectedKeys],
  )

  const allOnPageSelected =
    paginatedFiles.length > 0 && paginatedFiles.every((item) => selectedKeys.has(getFileKey(item)))
  const someOnPageSelected = paginatedFiles.some((item) => selectedKeys.has(getFileKey(item)))

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <CaretSortIcon />
    return sortDirection === 'asc' ? <CaretUpIcon /> : <CaretDownIcon />
  }

  const handleToggleSelectAllOnPage = (checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      paginatedFiles.forEach((item) => {
        if (checked) {
          next.add(getFileKey(item))
        } else {
          next.delete(getFileKey(item))
        }
      })
      return next
    })
  }

  const handleToggleSelectFile = (item: WorkspaceFileItem, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(getFileKey(item))
      } else {
        next.delete(getFileKey(item))
      }
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (!token || !currentWorkspace || selectedItemsInView.length === 0) return

    setUploadError(null)
    setUploadSuccess(null)
    setIsBatchDeleting(true)

    try {
      const accessToken = await resolveWorkspaceAccessToken()
      const results = await Promise.allSettled(
        selectedItemsInView.map((item) =>
          deleteWorkspaceFile(currentWorkspace, accessToken, item.storeType, item.fileName),
        ),
      )
      const failedCount = results.filter((result) => result.status === 'rejected').length
      const succeededCount = selectedItemsInView.length - failedCount

      if (succeededCount > 0) {
        setUploadSuccess(`Deleted ${succeededCount} file${succeededCount === 1 ? '' : 's'}.`)
      }
      if (failedCount > 0) {
        setUploadError(`Failed to delete ${failedCount} file${failedCount === 1 ? '' : 's'}.`)
      }
      setSelectedKeys(new Set())
      await refetchFiles()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Batch delete failed.')
    } finally {
      setIsBatchDeleting(false)
    }
  }

  const canUpload = Boolean(token && currentWorkspace && dataStoreFilter !== 'all')

  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    if (!token) {
      setUploadError('You must be signed in to upload files.')
      return
    }
    if (!currentWorkspace) {
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
            currentWorkspace,
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
          currentWorkspace,
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
    if (!currentWorkspace) {
      setUploadError('Select a workspace to delete files.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    const deletingKey = `${item.storeType}:${item.fileName}`
    setDeletingFileKey(deletingKey)

    try {
      const accessToken = await resolveWorkspaceAccessToken()
      await deleteWorkspaceFile(currentWorkspace, accessToken, item.storeType, item.fileName)
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
      <PageHeading title="Files" subtitle="Manage files stored in this workspace" />

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
        {token && !currentWorkspace && (
          <Callout type="info" message="Select a workspace to view its files." />
        )}

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

        {!filesLoading && !filesError && currentWorkspace && (
          <>
            <Flex justify="between" align="center" mb="3">
              <Text size="2" color="gray">
                {pageCount > 1
                  ? `Showing ${currentPage * FILES_PAGE_SIZE + 1}-${Math.min(
                      (currentPage + 1) * FILES_PAGE_SIZE,
                      filteredFiles.length,
                    )} of ${filteredFiles.length} files`
                  : filteredFiles.length === 1
                    ? 'Showing 1 file'
                    : `Showing ${filteredFiles.length} files`}
              </Text>
              {selectedItemsInView.length > 0 && (
                <Flex gap="2">
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <Button
                        size="2"
                        variant="soft"
                        color="red"
                        type="button"
                        disabled={isBatchDeleting}
                      >
                        Delete selected ({selectedItemsInView.length})
                      </Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content style={{ maxWidth: 420 }}>
                      <AlertDialog.Title>Delete files</AlertDialog.Title>
                      <AlertDialog.Description size="2">
                        Delete <strong>{selectedItemsInView.length}</strong> selected file
                        {selectedItemsInView.length === 1 ? '' : 's'}? This cannot be undone.
                      </AlertDialog.Description>
                      <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                          <Button variant="soft" color="gray">
                            Cancel
                          </Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button
                            variant="solid"
                            color="red"
                            onClick={() => void handleBatchDelete()}
                          >
                            Delete
                          </Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </Flex>
              )}
            </Flex>

            {filteredFiles.length === 0 ? (
              <Callout type="info" message="No files found for this workspace." />
            ) : (
              <>
                <Table.Root className={`${styles.ordersTable} ${styles.filesTable}`}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell data-column-id="select">
                        <Checkbox
                          size="2"
                          checked={
                            allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false
                          }
                          onCheckedChange={(checked) =>
                            handleToggleSelectAllOnPage(checked !== false)
                          }
                          aria-label="Select all files on this page"
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell data-column-id="fileName">
                        <Flex
                          align="center"
                          gap="1"
                          className={styles.sortableHeader}
                          onClick={() => handleSort('fileName')}
                        >
                          File name {renderSortIcon('fileName')}
                        </Flex>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell data-column-id="storeType">
                        <Flex
                          align="center"
                          gap="1"
                          className={styles.sortableHeader}
                          onClick={() => handleSort('storeType')}
                        >
                          Store {renderSortIcon('storeType')}
                        </Flex>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell data-column-id="size">
                        <Flex
                          align="center"
                          gap="1"
                          className={styles.sortableHeader}
                          onClick={() => handleSort('size')}
                        >
                          Size {renderSortIcon('size')}
                        </Flex>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell data-column-id="lastModified">
                        <Flex
                          align="center"
                          gap="1"
                          className={styles.sortableHeader}
                          onClick={() => handleSort('lastModified')}
                        >
                          Last modified {renderSortIcon('lastModified')}
                        </Flex>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell data-column-id="visibility">
                        Visibility
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell data-column-id="delete">
                        Delete
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedFiles.map((item: WorkspaceFileItem) => (
                      <Table.Row key={`${item.storeType}-${item.fileName}`}>
                        <Table.Cell data-column-id="select">
                          <Checkbox
                            size="2"
                            checked={selectedKeys.has(getFileKey(item))}
                            onCheckedChange={(checked) =>
                              handleToggleSelectFile(item, checked !== false)
                            }
                            aria-label={`Select ${item.fileName}`}
                          />
                        </Table.Cell>
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
                        <Table.Cell data-column-id="visibility">
                          <MockVisibilitySelect
                            storageKey={`mockVisibility:${currentWorkspace}:file:${item.storeType}:${item.fileName}`}
                            label={item.fileName}
                          />
                        </Table.Cell>
                        <Table.Cell data-column-id="delete">
                          <AlertDialog.Root>
                            <AlertDialog.Trigger>
                              <Button
                                size="2"
                                variant="soft"
                                color="red"
                                type="button"
                                disabled={Boolean(
                                  deletingFileKey === `${item.storeType}:${item.fileName}`,
                                )}
                                aria-label={`Delete ${item.fileName}`}
                              >
                                Delete
                              </Button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Content style={{ maxWidth: 420 }}>
                              <AlertDialog.Title>Delete file</AlertDialog.Title>
                              <AlertDialog.Description size="2">
                                Delete <strong>{item.fileName}</strong>? This cannot be undone.
                              </AlertDialog.Description>
                              <Flex gap="3" mt="4" justify="end">
                                <AlertDialog.Cancel>
                                  <Button variant="soft" color="gray">
                                    Cancel
                                  </Button>
                                </AlertDialog.Cancel>
                                <AlertDialog.Action>
                                  <Button
                                    variant="solid"
                                    color="red"
                                    onClick={() => void handleDeleteFile(item)}
                                  >
                                    Delete
                                  </Button>
                                </AlertDialog.Action>
                              </Flex>
                            </AlertDialog.Content>
                          </AlertDialog.Root>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                {pageCount > 1 && (
                  <Flex justify="center" mt="4">
                    <PageSelector
                      currentPageIndex={currentPage}
                      nextDisabled={currentPage === pageCount - 1}
                      onGoToPage={setCurrentPage}
                      onNextClick={() => setCurrentPage(currentPage + 1)}
                      onPreviousClick={() => setCurrentPage(currentPage - 1)}
                      pageCount={pageCount}
                      previousDisabled={currentPage === 0}
                    />
                  </Flex>
                )}
              </>
            )}
          </>
        )}
      </Flex>
    </Flex>
  )
}
