import {
  Button,
  Heading,
  Link,
  Text,
  Dialog,
  Spinner,
  Flex,
} from '@radix-ui/themes'
import { useContext, useMemo, useState } from 'react'

import {
  AnalysedUserAssets,
  RowSelection,
  UserAssets,
} from '../../../library/userAssets/userAssetTypes'
import { analyseAssets } from '../../../library/userAssets/analyseAssets'
import { AssetsPageContext } from '../../../context/AssetsPageContext'
import { AssetsSelect } from '../../AssetsSelect/AssetsSelect'
import { AssetsTable } from '../../AssetsTable/AssetsTable'
import { AuthenticationContext } from '../../../context/AuthenticationContext'
import { convertSimpleGeoJSONToDataForTable } from '../../../library/userAssets/convertUserAssets'
import { Map } from '../../Map/Map'
import { PageSubtitle } from '../../PageSubtitle'
import { PageWithMapLayout } from '../../Layout/PageWithMapLayout'
import samplePortfolios from '../../../library/api/samplePortfolios.json'
import { toast } from 'react-toastify'
import { UploadButtonAndDialog } from '../../UploadButtonAndDialog/UploadButtonAndDialog'
import { uploadUserAssets } from '../../../library/api/uploadUserAssets'
import { useMap } from '../../Map/useMap'
import { useNavigate } from 'react-router-dom'
import { UserAssetsContext } from '../../../context/UserAssetsContext'
import { WorkflowModalContent } from './WorkflowModalContent'
import { workflowNickNamesByHubWorkflowName } from '../../../configuration/constants'
import assetStyles from './Assets.module.scss'
import sidebarStyles from '../../Layout/Sidebar.module.scss'
import { HandleAnalyseAssetsProps } from './assetsTypes'
import { useSyncAssetsTableSelectionWithMapAssets } from '../../../library/userAssets/useSyncAssetsTableSelectionWithMapAssets'
import { HubWorkflowOptions } from '../../../library/api/apiTypes'
import { PortfoliosContext } from '../../../context/PortfoliosContext'
import { getFilenameFromAwsFileKey } from '../../../library/api/getFilenameFromAwsFileKey'
import { getUploadedFileUrl } from '../../../library/api/getUrls'

export const Assets = () => {
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false)
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelection>({})
  const [isFileUploading, setIsFileUploading] = useState(false)
  const [selectedWorkflowOptions, setSelectedWorkflowOptions] =
    useState<HubWorkflowOptions | null>(null)
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false)

  const navigate = useNavigate()

  const { updateUploadedFilesList } = useContext(PortfoliosContext)

  const {
    authenticatedAxios,
    isAuthenticated,
    login,
    token,
    userInfo,
    workspaceUserName,
  } = useContext(AuthenticationContext)
  const {
    persistedMapCenter,
    persistedMapZoom,
    setPersistedMapCenter,
    setPersistedMapZoom,
  } = useContext(AssetsPageContext)

  const { mapContainer, mapRef, isMapLoaded } = useMap({
    center: persistedMapCenter,
    setPersistedMapCenter,
    zoom: persistedMapZoom,
    setPersistedMapZoom,
  })
  const {
    areUserAssetsASamplePortfolio,
    currentWorkflowTitle,
    setAnalysedAssetsFileName,
    setAnalysedAssetsWorkflowNickname,
    setAnalysedAssetsWorkflowTitle,
    setAnalysedUserAssets,
    setAnalysisRunDate,
    setAreUserAssetsASamplePortfolio,
    setCurrentWorkflowNickname,
    setCurrentWorkflowTitle,
    setUploadedFileName,
    setUserAssets,
    setWorkflowJobIdAssociatedWithData,
    uploadedFileName,
    userAssets,
  } = useContext(UserAssetsContext)

  const userAssetsForTable = useMemo(
    () => convertSimpleGeoJSONToDataForTable(userAssets),
    [userAssets],
  )

  const { toggleAllMapAssetsSelection, toggleMapAssetSelection } =
    useSyncAssetsTableSelectionWithMapAssets({
      isMapLoaded,
      mapRef,
      userAssetsForTable,
      rowSelection,
    })

  const resetAssetsState = () => {
    setCurrentWorkflowNickname?.(null)
    setCurrentWorkflowTitle?.(null)
    setRowSelection({})
    toggleAllMapAssetsSelection(false)
  }

  const handleLoadAssets = ({
    fileName,
    assets,
  }: {
    fileName: string
    assets: UserAssets
  }) => {
    if (!authenticatedAxios || !workspaceUserName) {
      toast.error('Please log in to upload a file.')
      return
    }
    setIsFileUploading(true)
    uploadUserAssets({
      authenticatedAxios,
      assets,
      fileName,
      workspaceUserName,
    })
      .then(() => {
        resetAssetsState()
        setUserAssets?.(assets)
        setUploadedFileName?.(fileName)
        updateUploadedFilesList()

        toast.success('File uploaded to data hub successfully', {
          autoClose: 5000,
        })
      })
      .catch(() => {
        toast.error('Error uploading file to data hub')
      })
      .finally(() => {
        setIsFileUploading(false)
      })
  }
  const handleViewAnalysis = ({
    jobId,
    analysedData,
    analysisWorkflowNickname,
  }: {
    jobId: string
    analysedData: AnalysedUserAssets
    analysisWorkflowNickname: string
  }) => {
    setWorkflowJobIdAssociatedWithData?.(jobId)
    setAnalysedUserAssets?.(analysedData)
    setAnalysisRunDate?.(
      ` ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    )
    setAnalysedAssetsFileName?.(uploadedFileName ?? 'Unknown file name')
    setAnalysedAssetsWorkflowNickname?.(analysisWorkflowNickname)
    setAnalysedAssetsWorkflowTitle?.(selectedWorkflowOptions?.title ?? null)

    setTimeout(() => {
      // give react a second to update state so that table shows data - otherwise there is an issue with the analytics page where it sometimes doesnt update from context. Could be a react-table thing?
      navigate('/analytics')
    }, 1000)
  }
  const handleAnalyseAssets = ({
    endDate,
    hubWorkflowPresetInputs,
    startDate,
  }: HandleAnalyseAssetsProps) => {
    if (!userAssets) {
      throw new Error('handleAnalyseAssets has a missing userAssets parameter')
    }
    if (!uploadedFileName) {
      throw new Error(
        'handleAnalyseAssets has a missing uploadedFileName parameter',
      )
    }
    if (
      !setAnalysedAssetsFileName ||
      !setAnalysedAssetsWorkflowNickname ||
      !setAnalysedUserAssets ||
      !setAnalysisRunDate ||
      !setAnalysisRunDate ||
      !setWorkflowJobIdAssociatedWithData
    ) {
      throw new Error(
        'handleAnalyseAssets depends on UserAssetsContext state setters',
      )
    }
    if (!userInfo || !authenticatedAxios || !workspaceUserName) {
      toast.error('Please log in to run an analysis.')

      return
    }

    if (!isAuthenticated || !token) {
      void login()
      return
    }

    if (!hubWorkflowPresetInputs || !selectedWorkflowOptions) {
      toast.error(
        'Sorry, the configuration for this workflow is broken on our end. Please select another workflow.',
      )
      return
    }

    const workflowNickName =
      workflowNickNamesByHubWorkflowName[hubWorkflowPresetInputs.workflow]

    toast.dismiss()
    toast.success(
      <>
        <strong>Analysis in Progress</strong>
        <br />
        You will receive a notification when it&apos;s ready.
      </>,
    )
    setCurrentWorkflowNickname?.(workflowNickName)
    setCurrentWorkflowTitle?.(selectedWorkflowOptions.title)
    setIsWorkflowModalOpen(false)
    setIsAnalysisRunning(true)
    analyseAssets({
      authToken: token,
      axios: authenticatedAxios,
      endDate,
      fileName: uploadedFileName,
      hubWorkflowPresetInputs,
      startDate,
      workspaceUserName,
      areUserAssetsASamplePortfolio,
    })
      .then(({ analysedData, jobId }) => {
        // eslint-disable-next-line no-console
        console.log('Risk analysis results:', analysedData)
        toast.dismiss()
        const toastId = toast.success(
          <div
            className={assetStyles.analysisSuccessToastMessageAndButtonWrapper}
          >
            <div className={assetStyles.analysisSuccessToastMessage}>
              <strong>
                {workflowNickName} Analysis complete{' '}
                {uploadedFileName ? <>for</> : null}
              </strong>
              {uploadedFileName ? uploadedFileName : null}
            </div>

            <Button
              variant="surface"
              onClick={() => {
                toast.dismiss(toastId)
                handleViewAnalysis({
                  jobId,
                  analysedData,
                  analysisWorkflowNickname: workflowNickName,
                })
              }}
            >
              View Analysis
            </Button>
          </div>,
        )
      })
      .catch(() => {
        toast.dismiss()
        toast.error('An error occurred during the analysis. Please try again.')
      })
      .finally(() => {
        setIsAnalysisRunning(false)
      })
  }

  const loadUserAssetsFromUrl = async (url: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`)
      }
      const data = await response.json()
      setUserAssets?.(data as UserAssets)
    } catch (error) {
      toast.error(
        'There was an issue accessing that portfolio. Please try again.',
      )
    }
  }

  const loadPortfolio = async (id: string) => {
    setIsPortfolioLoading(true)
    const selectedSamplePortfolio = samplePortfolios.find(
      (portfolio) => portfolio.id === id,
    )

    setAreUserAssetsASamplePortfolio?.(!!selectedSamplePortfolio)

    if (selectedSamplePortfolio) {
      resetAssetsState()
      setUploadedFileName?.(selectedSamplePortfolio.fileName)

      try {
        await loadUserAssetsFromUrl(selectedSamplePortfolio.fileName)
      } catch (error) {
        toast.error(
          'There was an issue accessing that portfolio. Please try again.',
        )
      }
      setIsPortfolioLoading(false)

      return
    }

    if (!authenticatedAxios || !workspaceUserName) {
      toast.error(
        'There was an issue with authentication. Try logging in again.',
      )
      setIsPortfolioLoading(false)

      return
    }
    return authenticatedAxios
      .get(getUploadedFileUrl({ workspaceUserName, fileName: id }))
      .then((response) => {
        if (!setUserAssets) throw new Error('No setUserAssets')
        if (!response) throw new Error('No response')

        resetAssetsState()
        setUploadedFileName?.(
          getFilenameFromAwsFileKey({ key: id, workspaceUserName }) ??
            'Unknown file name',
        )
        setUserAssets(response.data as UserAssets)
      })
      .catch(() => {
        toast.error(
          'There was an issue accessing that portfolio. Please try again.',
        )
      })
      .finally(() => {
        setIsPortfolioLoading(false)
      })
  }

  const uploadButton = (
    <Link asChild>
      <button className={assetStyles.openFileButton} disabled={isFileUploading}>
        {isFileUploading ? <Spinner /> : <>+</>} Open File
      </button>
    </Link>
  )

  const handleDialogOpenChange = (isOpen: boolean) => {
    setSelectedWorkflowOptions(null)
    setIsWorkflowModalOpen(isOpen)
  }

  const sidebarContent = (
    <div className={sidebarStyles.content}>
      <div className={assetStyles.sidebarTopSection}>
        <div className={assetStyles.selectPortfolioRow}>
          <div className={assetStyles.assetsSelectWrapper}>
            <Flex gap={'1'}>
              <label>Portfolios </label>
              {isPortfolioLoading ? <Spinner /> : null}
            </Flex>

            <AssetsSelect onValueChange={loadPortfolio} />
          </div>
          <UploadButtonAndDialog
            onLoadAssets={handleLoadAssets}
            trigger={uploadButton}
            description="Select a file for analysis"
          />
        </div>
        {!userAssets ? (
          <div className={assetStyles.uploadGuildelinesWrapper}>
            <Heading as="h3" size="3">
              Please adhere to these guidelines before adding a file:
            </Heading>
            <Heading as="h4" size="3">
              File types accepted
            </Heading>
            <p>CSV or GeoJSON FeatureCollection</p>
            <Heading as="h4" size="3">
              File attributes must include
            </Heading>
            <p>id, latitude, and longitude</p>
            <Heading as="h4" size="3">
              Note
            </Heading>
            <p>
              Specific asset analysis workflows may require further attributes
            </p>
            <p>
              You can also download a csv template{' '}
              <Link href="/template.csv" download>
                here
              </Link>
            </p>
          </div>
        ) : null}
        {userAssets ? (
          <AssetsTable
            isMapLoaded={isMapLoaded}
            mapRef={mapRef}
            userAssetsForTable={userAssetsForTable}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            toggleAllMapAssetsSelection={toggleAllMapAssetsSelection}
            toggleMapAssetSelection={toggleMapAssetSelection}
          />
        ) : null}
      </div>

      <div className={assetStyles.analyseButtonRow}>
        {userAssets ? (
          <Dialog.Root
            open={isWorkflowModalOpen}
            onOpenChange={handleDialogOpenChange}
          >
            <Dialog.Trigger>
              <Button disabled={isAnalysisRunning}>Analyse Assets</Button>
            </Dialog.Trigger>

            <Dialog.Content maxWidth="800px">
              <WorkflowModalContent
                handleAnalyseAssets={handleAnalyseAssets}
                setSelectedWorkflowOptions={setSelectedWorkflowOptions}
                selectedWorkflowOptions={selectedWorkflowOptions}
              />
            </Dialog.Content>
          </Dialog.Root>
        ) : null}
      </div>
    </div>
  )

  const portfolioWorkflowInfo = (
    <Text as="p">
      Portfolio: {uploadedFileName}
      {currentWorkflowTitle ? <> | Workflow: {currentWorkflowTitle}</> : null}
    </Text>
  )

  return (
    <PageWithMapLayout
      map={<Map mapContainer={mapContainer} />}
      sidebarContent={sidebarContent}
      title="Assets"
      subtitle={
        <>
          <PageSubtitle>
            Choose an existing portfolio or open a new file for analysis
          </PageSubtitle>
          {uploadedFileName ? portfolioWorkflowInfo : null}
        </>
      }
      sidebarWidth="900px"
    />
  )
}
