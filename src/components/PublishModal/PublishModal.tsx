import React, { useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Dialog,
  Flex,
  RadioCards,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes'
import { useDropzone } from 'react-dropzone'
import { CheckCircledIcon, Cross1Icon, Cross2Icon, FileIcon } from '@radix-ui/react-icons'
import { WorkspaceFileItem } from '@/services/workspaceFilesService'
import { formatFileSize } from '@/library/fileUtils'
import styles from './PublishModal.module.scss'

// UI/UX preview only — see "Redesign the data-publishing flow and APIs" task note.
// No collection/publish API exists yet; all state here is local and nothing is submitted.
//
// Per https://eodatahub.org.uk/docs/documentation/data-publishing/, publishing a file's
// visibility (object/block store access) is independent of the STAC catalogue — a file
// doesn't need to belong to a collection to be published. Only STAC Items (metadata
// describing the data) belong to a Collection. So "add to catalogue" is modelled here as
// an optional add-on, not a required first step.
const MOCK_COLLECTIONS = ['processing-results', 'tiff-to-cog', 'sentinel-derived-products']
const NEW_COLLECTION_VALUE = '__new__'
const STEP_LABELS = ['Data & metadata', 'Visibility', 'Review & publish']

type Visibility = 'private' | 'workspace' | 'public'

const VISIBILITY_COPY: Record<Visibility, { label: string; description: string }> = {
  private: { label: 'Private', description: 'Only you can access these files.' },
  workspace: {
    label: 'Workspace',
    description: 'Everyone in this workspace can access these files.',
  },
  public: {
    label: 'Public',
    description: 'Anyone with the link can access these files.',
  },
}

interface PublishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: WorkspaceFileItem[]
  workspace: string
}

export const PublishModal: React.FC<PublishModalProps> = ({
  open,
  onOpenChange,
  files,
  workspace,
}) => {
  const [step, setStep] = useState(0)
  const [addToCatalogue, setAddToCatalogue] = useState(false)
  const [collectionValue, setCollectionValue] = useState<string>(MOCK_COLLECTIONS[0])
  const [newCollectionName, setNewCollectionName] = useState('')
  const [metadataFile, setMetadataFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [isPublishing, setIsPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length > 0) setMetadataFile(accepted[0])
    },
    maxFiles: 1,
    accept: { 'application/json': ['.json'] },
  })

  const isCreatingNewCollection = collectionValue === NEW_COLLECTION_VALUE
  const collectionName = isCreatingNewCollection ? newCollectionName.trim() : collectionValue

  const resetState = () => {
    setStep(0)
    setAddToCatalogue(false)
    setCollectionValue(MOCK_COLLECTIONS[0])
    setNewCollectionName('')
    setMetadataFile(null)
    setVisibility('private')
    setIsPublishing(false)
    setPublished(false)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  const canGoNext = useMemo(() => {
    if (step === 0 && addToCatalogue) {
      return isCreatingNewCollection ? collectionName.length > 0 : true
    }
    return true
  }, [step, addToCatalogue, isCreatingNewCollection, collectionName])

  const handlePublish = () => {
    setIsPublishing(true)
    setTimeout(() => {
      setIsPublishing(false)
      setPublished(true)
    }, 1200)
  }

  const isLastStep = step === STEP_LABELS.length - 1

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content maxWidth="560px">
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title mb="0">Publish data</Dialog.Title>
          <Dialog.Close>
            <Button variant="ghost" aria-label="Close">
              <Cross1Icon />
            </Button>
          </Dialog.Close>
        </Flex>

        {published ? (
          <Flex direction="column" gap="3" align="center" py="4">
            <CheckCircledIcon width="32" height="32" color="var(--green-9)" />
            <Text size="4" weight="medium">
              Queued for publishing
            </Text>
            <Text size="2" color="gray" align="center">
              {files.length} file{files.length === 1 ? '' : 's'} will be{' '}
              <strong>{VISIBILITY_COPY[visibility].label.toLowerCase()}</strong>
              {addToCatalogue && collectionName ? (
                <>, and added to the &quot;{collectionName}&quot; collection in the catalogue</>
              ) : null}
              .
            </Text>
            <Text size="1" color="gray">
              (UI preview only — nothing was actually published.)
            </Text>
            <Button onClick={() => handleClose(false)}>Close</Button>
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            <Flex gap="2" wrap="wrap">
              {STEP_LABELS.map((label, index) => (
                <Badge
                  key={label}
                  color={index === step ? 'blue' : index < step ? 'green' : 'gray'}
                  variant={index === step ? 'solid' : 'soft'}
                >
                  {index + 1}. {label}
                </Badge>
              ))}
            </Flex>

            {step === 0 && (
              <Flex direction="column" gap="4">
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">
                    Data files ({files.length})
                  </Text>
                  <Flex direction="column" gap="1" className={styles.fileList}>
                    {files.map((file) => (
                      <Flex
                        key={`${file.storeType}-${file.fileName}`}
                        align="center"
                        justify="between"
                        gap="2"
                      >
                        <Flex align="center" gap="2">
                          <FileIcon />
                          <Text size="2">{file.fileName}</Text>
                        </Flex>
                        <Text size="1" color="gray">
                          {formatFileSize(file.size)}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Flex>

                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2">
                    <Checkbox
                      checked={addToCatalogue}
                      onCheckedChange={(checked) => setAddToCatalogue(checked === true)}
                    />
                    <Text
                      size="2"
                      weight="medium"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setAddToCatalogue(!addToCatalogue)}
                    >
                      Also add this data to the catalogue
                    </Text>
                  </Flex>
                  <Text size="1" color="gray">
                    Optional — makes this data discoverable via a STAC Item in a collection.
                    Publishing the files themselves (next step) doesn&apos;t require this.
                  </Text>
                </Flex>

                {addToCatalogue && (
                  <Flex direction="column" gap="3" className={styles.catalogueSection}>
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="medium">
                        Collection
                      </Text>
                      <Text size="1" color="gray">
                        Choose a collection in <strong>{workspace}</strong> for the STAC Item
                        describing this data.
                      </Text>
                      <Select.Root value={collectionValue} onValueChange={setCollectionValue}>
                        <Select.Trigger style={{ width: '100%' }} />
                        <Select.Content position="popper">
                          <Select.Group>
                            {MOCK_COLLECTIONS.map((name) => (
                              <Select.Item key={name} value={name}>
                                {name}
                              </Select.Item>
                            ))}
                          </Select.Group>
                          <Select.Separator />
                          <Select.Item value={NEW_COLLECTION_VALUE}>
                            + Create new collection
                          </Select.Item>
                        </Select.Content>
                      </Select.Root>
                      {isCreatingNewCollection && (
                        <TextField.Root
                          placeholder="New collection name"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                        />
                      )}
                    </Flex>

                    <Flex direction="column" gap="2">
                      <Text size="2" weight="medium">
                        STAC Item metadata
                      </Text>
                      {metadataFile ? (
                        <Flex align="center" justify="between" className={styles.metadataFile}>
                          <Flex align="center" gap="2">
                            <FileIcon />
                            <Text size="2">{metadataFile.name}</Text>
                          </Flex>
                          <Button
                            variant="ghost"
                            color="gray"
                            size="1"
                            onClick={() => setMetadataFile(null)}
                            aria-label="Remove metadata file"
                          >
                            <Cross2Icon />
                          </Button>
                        </Flex>
                      ) : (
                        <Box
                          {...getRootProps()}
                          className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
                        >
                          <input {...getInputProps()} />
                          <Text size="2" color="gray">
                            Drag a STAC Item JSON file here, or click to select
                          </Text>
                        </Box>
                      )}
                      <Text size="1" color="gray">
                        Asset links to your data files above will be filled in automatically — no
                        manual editing needed.
                      </Text>
                    </Flex>
                  </Flex>
                )}
              </Flex>
            )}

            {step === 1 && (
              <Flex direction="column" gap="3">
                <Text size="2" color="gray">
                  Who should be able to access {files.length === 1 ? 'this file' : 'these files'}?
                </Text>
                <RadioCards.Root
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as Visibility)}
                  columns="1"
                >
                  {(Object.keys(VISIBILITY_COPY) as Visibility[]).map((key) => (
                    <RadioCards.Item key={key} value={key}>
                      <Flex direction="column" gap="1">
                        <Text weight="medium">{VISIBILITY_COPY[key].label}</Text>
                        <Text size="1" color="gray">
                          {VISIBILITY_COPY[key].description}
                        </Text>
                      </Flex>
                    </RadioCards.Item>
                  ))}
                </RadioCards.Root>
                {addToCatalogue && visibility !== 'public' && (
                  <Text size="1" color="gray">
                    Note: the &quot;{collectionName || 'new'}&quot; collection entry will still be
                    catalogued, but the underlying files will stay{' '}
                    {VISIBILITY_COPY[visibility].label.toLowerCase()}.
                  </Text>
                )}
              </Flex>
            )}

            {step === 2 && (
              <Flex direction="column" gap="2" className={styles.summary}>
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Data files
                  </Text>
                  <Text size="2" weight="medium">
                    {files.length}
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Catalogue
                  </Text>
                  <Text size="2" weight="medium">
                    {addToCatalogue
                      ? `${collectionName || '—'} (${metadataFile?.name ?? 'STAC Item pending'})`
                      : 'Not added'}
                  </Text>
                </Flex>
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">
                    Visibility
                  </Text>
                  <Badge
                    color={
                      visibility === 'public'
                        ? 'green'
                        : visibility === 'workspace'
                          ? 'blue'
                          : 'gray'
                    }
                  >
                    {VISIBILITY_COPY[visibility].label}
                  </Badge>
                </Flex>
              </Flex>
            )}

            <Flex justify="between" mt="2">
              <Button
                variant="soft"
                color="gray"
                onClick={() => (step === 0 ? handleClose(false) : setStep(step - 1))}
              >
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              {isLastStep ? (
                <Button disabled={isPublishing} onClick={handlePublish}>
                  {isPublishing ? 'Publishing…' : 'Publish'}
                </Button>
              ) : (
                <Button disabled={!canGoNext} onClick={() => setStep(step + 1)}>
                  Next
                </Button>
              )}
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
