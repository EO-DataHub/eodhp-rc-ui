import React, { useContext, useEffect, useState } from 'react'
import { Dialog, Button, Flex, Text, Select } from '@radix-ui/themes'
import { fetchCollections, fetchUserCollections } from '@/services/collectionService'
import { fetchItems, fetchUserItems } from '@/services/itemService'
import { catalogs } from '@/constants/catalogs'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import type { NotebookConfig } from '@/hooks/useNotebookConfigs'
import type { Collection, Item } from '@/types'
import styles from '@/components/Map/RestoreAOIDialog.module.scss'
import { getNotebookLinksForItems } from '@/library/notebookUtils'

interface NotebookCollectionDatasetModalProps {
  open: boolean
  onClose: () => void
  notebook: NotebookConfig | null
}

const MAX_ITEMS = 100

const NotebookCollectionDatasetModal: React.FC<NotebookCollectionDatasetModalProps> = ({
  open,
  onClose,
  notebook,
}) => {
  const { currentWorkspace, token, isAuthenticated } = useContext(AuthenticationContext)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)
  const [datasets, setDatasets] = useState<Record<string, Item[]>>({})
  const [loadingDatasets, setLoadingDatasets] = useState<Record<string, boolean>>({})
  const [datasetsError, setDatasetsError] = useState<Record<string, string | null>>({})
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('')

  // Fetch collections by ID from all catalogs
  useEffect(() => {
    if (!notebook?.collections) return
    setLoadingCollections(true)
    setCollectionsError(null)
    setSelectedCollectionId('')
    setSelectedDatasetId('')
    Promise.all(
      notebook.collections.map(async (colId) => {
        for (const catalog of catalogs) {
          try {
            const cols = await fetchCollections(catalog, 100)
            const found = cols.find((c) => c.id === colId)
            if (found) return found
          } catch (e) {
            // ignore, try next catalog
          }
        }
        return null
      }),
    )
      .then((results) => {
        setCollections(results.filter(Boolean) as Collection[])
        setLoadingCollections(false)
      })
      .catch(() => {
        setCollectionsError('Failed to fetch collections')
        setLoadingCollections(false)
      })
  }, [notebook])

  // Fetch datasets for the selected collection
  useEffect(() => {
    if (!selectedCollectionId) return
    if (datasets[selectedCollectionId] || loadingDatasets[selectedCollectionId]) return
    setLoadingDatasets((prev) => ({ ...prev, [selectedCollectionId]: true }))
    setDatasetsError((prev) => ({ ...prev, [selectedCollectionId]: null }))
    const fetch = async () => {
      try {
        let items: Item[] = []
        const col = collections.find((c) => c.id === selectedCollectionId)
        if (!col) return
        if (col.isUserCollection && isAuthenticated && currentWorkspace && token) {
          const userCols = await fetchUserCollections(currentWorkspace, token)
          const userCol = userCols.find((c) => c.id === col.id)
          if (userCol) {
            items = await fetchUserItems(userCol, token)
          }
        } else {
          items = await fetchItems({ limit: MAX_ITEMS, selectedCollection: col })
        }
        setDatasets((prev) => ({ ...prev, [col.id]: items }))
      } catch (e) {
        setDatasetsError((prev) => ({
          ...prev,
          [selectedCollectionId]: 'Failed to fetch datasets',
        }))
      } finally {
        setLoadingDatasets((prev) => ({ ...prev, [selectedCollectionId]: false }))
      }
    }
    void fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollectionId, isAuthenticated, currentWorkspace, token, collections])

  // Reset dataset selection if collection changes
  useEffect(() => {
    setSelectedDatasetId('')
  }, [selectedCollectionId])

  // Build notebook URL for the selected dataset
  const getNotebookUrl = () => {
    if (!notebook || !selectedCollectionId || !selectedDatasetId) return undefined
    const items = datasets[selectedCollectionId]?.filter((item) => item.id === selectedDatasetId)
    if (!items || items.length === 0) return undefined
    const links = getNotebookLinksForItems(items, [notebook])
    return links[0]?.url
  }

  const notebookUrl = getNotebookUrl()

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="600px" className={styles.dialogContent}>
        <Dialog.Title>{notebook?.label ?? 'Notebook'}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Select a collection and then a dataset:
        </Dialog.Description>
        {loadingCollections ? (
          <Text>Loading collections...</Text>
        ) : collectionsError ? (
          <Text color="red">{collectionsError}</Text>
        ) : (
          <Flex direction="column" gap="4">
            <div style={{ marginBottom: 16 }}>
              <Text weight="bold" size="3">
                Collection
              </Text>
              <Select.Root
                size="2"
                value={selectedCollectionId}
                onValueChange={setSelectedCollectionId}
              >
                <Select.Trigger
                  placeholder="Select a collection"
                  style={{ width: '100%', marginTop: 8 }}
                />
                <Select.Content position="popper">
                  <Select.Group>
                    {collections.length > 0 ? (
                      collections.map((col) => (
                        <Select.Item key={col.id} value={col.id}>
                          {col.displayedTitle ?? col.title ?? col.id}
                        </Select.Item>
                      ))
                    ) : (
                      <Select.Item value="" disabled>
                        No collections available
                      </Select.Item>
                    )}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
            {selectedCollectionId && (
              <div style={{ marginBottom: 16 }}>
                <Text weight="bold" size="3">
                  Dataset
                </Text>
                {loadingDatasets[selectedCollectionId] ? (
                  <Text size="2">Loading datasets...</Text>
                ) : datasetsError[selectedCollectionId] ? (
                  <Text color="red" size="2">
                    {datasetsError[selectedCollectionId]}
                  </Text>
                ) : (
                  <Select.Root
                    size="2"
                    value={selectedDatasetId}
                    onValueChange={setSelectedDatasetId}
                  >
                    <Select.Trigger
                      placeholder="Select a dataset"
                      style={{ width: '100%', marginTop: 8 }}
                    />
                    <Select.Content position="popper">
                      <Select.Group>
                        {datasets[selectedCollectionId] &&
                        datasets[selectedCollectionId].length > 0 ? (
                          datasets[selectedCollectionId].map((item) => (
                            <Select.Item key={item.id} value={item.id}>
                              {item.id ?? ''}
                            </Select.Item>
                          ))
                        ) : (
                          <Select.Item value="" disabled>
                            No datasets available
                          </Select.Item>
                        )}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                )}
              </div>
            )}
          </Flex>
        )}
        <Flex justify="end" mt="4" gap="3">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={onClose} className={styles.cancelButton}>
              Close
            </Button>
          </Dialog.Close>
          <Button
            asChild
            disabled={!selectedCollectionId || !selectedDatasetId || !notebookUrl}
            style={{ marginLeft: 8 }}
          >
            <a href={notebookUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
              Open in Notebook
            </a>
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default NotebookCollectionDatasetModal
