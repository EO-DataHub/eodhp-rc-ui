import { Button, Dialog, Link, Spinner, Text } from '@radix-ui/themes'
import { ReactNode, useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

import { parseUploadedAssetsIntoGeoJson } from '../../library/userAssets/parseUploadedAssetsIntoGeoJson'
import { UserAssets } from '../../library/userAssets/userAssetTypes'
import buttonStyles from '../../library/genericStyles/buttons.module.scss'
import uploadButtonAndDialogStyles from './UploadButtonAndDialog.module.scss'
import UploadIcon from '@material-design-icons/svg/filled/upload_file.svg?react'
import UploadCompleteIcon from '@material-design-icons/svg/filled/check_circle.svg?react'

export const UploadButtonAndDialog = ({
  onLoadAssets,
  trigger,
  description,
}: {
  onLoadAssets: (parameters: { assets: UserAssets; fileName: string }) => void
  trigger: ReactNode
  description: string
}) => {
  const [chosenUnparsedFiles, setChosenUnparsedFiles] = useState<File[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFileLoading, setIsFileLoading] = useState(false)
  const [isFileParseError, setIsFileParseError] = useState(false)
  const [parsedAssets, setParsedAssets] = useState<UserAssets | null>(null)

  const formatAssets = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length < 0) return

    setIsFileParseError(false)
    setIsFileLoading(true)

    parseUploadedAssetsIntoGeoJson?.(acceptedFiles?.[0])
      .then((response) => {
        setIsFileLoading(false)

        if (!response?.features.length) {
          setIsFileParseError(true)
        }
        if (response?.features.length) {
          setParsedAssets(response)
        }
      })
      .catch(() => {
        setIsFileParseError(true)
        setIsFileLoading(false)
      })
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setChosenUnparsedFiles(acceptedFiles ?? [])
      formatAssets(acceptedFiles)
    },
    [formatAssets],
  )

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFileBrowser,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.geojson'],
    },
    maxFiles: 1,
    noClick: true,
  })

  const handleDialogOpenChange = (isOpen: boolean) => {
    setChosenUnparsedFiles([])
    setParsedAssets(null)
    setIsFileParseError(false)
    setIsDialogOpen(isOpen)
  }

  const handleLoadAssetsClick = () => {
    setIsDialogOpen(false)
    onLoadAssets({
      assets: parsedAssets,
      fileName: chosenUnparsedFiles?.[0]?.name,
    })
  }

  const cancelUpload = () => {
    setParsedAssets(null)
    setIsDialogOpen(false)
  }

  const chosenFile = chosenUnparsedFiles?.[0]
  const dropzoneClassNameToUse = isDragActive
    ? `${uploadButtonAndDialogStyles.dropzone} ${uploadButtonAndDialogStyles.dropzoneActive}`
    : uploadButtonAndDialogStyles.dropzone

  const chosenFileInfo = chosenFile ? (
    <table className={uploadButtonAndDialogStyles.fileDescription}>
      <tbody>
        <tr>
          <td>{chosenFile.name}</td>
          <td>{(chosenFile.size * 0.000001).toFixed(4)} MB</td>
        </tr>
      </tbody>
    </table>
  ) : null

  return (
    <Dialog.Root open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>

      <Dialog.Content className={uploadButtonAndDialogStyles.dialogContent}>
        <Dialog.Title>Open File</Dialog.Title>
        <Dialog.Description size="2">{description}</Dialog.Description>
        <div
          {...getRootProps({
            className: dropzoneClassNameToUse,
          })}
        >
          <input {...getInputProps()} />

          {isFileLoading ? (
            <>
              <Spinner size="3" />
              <Text weight="bold">File opening in progress</Text>
              {chosenFileInfo}
            </>
          ) : null}
          {!isFileLoading && !parsedAssets ? (
            <>
              <UploadIcon />
              <Text weight="bold">
                Drag and drop CSV or GeoJSON file or
                <br />
                <Link asChild>
                  <button onClick={openFileBrowser}>Choose File</button>
                </Link>
              </Text>
            </>
          ) : null}
          {parsedAssets && !isFileLoading ? (
            <>
              <UploadCompleteIcon />
              <Text weight="bold">File opened</Text>
            </>
          ) : null}

          {fileRejections.length > 0 ? (
            <Text className={uploadButtonAndDialogStyles.fileRejectedError}>
              Unsupported file type. Please choose a .csv or .geojson file.
            </Text>
          ) : null}
          {isFileParseError ? (
            <Text className={uploadButtonAndDialogStyles.fileRejectedError}>
              There was an error parsing file. Please review asset formatting
              guidelines and try again.{' '}
            </Text>
          ) : null}
        </div>
        <div className={buttonStyles.buttonWrapperFlexEnd}>
          <Button variant="soft" onClick={cancelUpload}>
            Cancel
          </Button>
          <Button onClick={handleLoadAssetsClick} disabled={!parsedAssets}>
            Load Assets
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}
