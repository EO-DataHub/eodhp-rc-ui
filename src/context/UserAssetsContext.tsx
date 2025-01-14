import {
  useState,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
} from 'react'
import { ReactNode, createContext } from 'react'

import {
  AnalysedUserAssets,
  UserAssets,
} from '../library/userAssets/userAssetTypes'
import { AuthenticationContext } from './AuthenticationContext'
import { getCsvResultsUrl } from '../library/api/getUrls'
import { HubWorkflowNicknames } from '../configuration/constants'

interface UserAssetsContextValue {
  analysedAssetsFileName?: string | null
  analysedAssetsWorkflowNickname: string | null
  analysedAssetsWorkflowTitle: string | null
  analysedUserAssets?: AnalysedUserAssets
  analysisRunDate?: string
  csvResults?: string | null
  currentWorkflowNickname: string | null
  currentWorkflowTitle: string | null
  setAnalysedAssetsFileName?: Dispatch<SetStateAction<string | null>>
  setAnalysedAssetsWorkflowNickname?: Dispatch<SetStateAction<string | null>>
  setAnalysedAssetsWorkflowTitle?: Dispatch<SetStateAction<string | null>>
  setAnalysedUserAssets?: Dispatch<SetStateAction<AnalysedUserAssets>>
  setAnalysisRunDate?: Dispatch<SetStateAction<string | undefined>>
  setCurrentWorkflowNickname?: Dispatch<SetStateAction<string | null>>
  setCurrentWorkflowTitle?: Dispatch<SetStateAction<string | null>>
  setUploadedFileName?: Dispatch<SetStateAction<string | null>>
  setUserAssets?: Dispatch<SetStateAction<UserAssets>>
  setWorkflowJobIdAssociatedWithData?: Dispatch<SetStateAction<string | null>>
  uploadedFileName?: string | null
  userAssets?: UserAssets
  workflowJobIdAssociatedWithData?: string | null
  areUserAssetsASamplePortfolio: boolean
  setAreUserAssetsASamplePortfolio?: Dispatch<SetStateAction<boolean>>
}

export const UserAssetsContext = createContext<UserAssetsContextValue>({
  analysedAssetsWorkflowNickname: null,
  analysedAssetsWorkflowTitle: null,
  currentWorkflowNickname: null,
  currentWorkflowTitle: null,
  areUserAssetsASamplePortfolio: false,
})

export const UserAssetsProvider = ({ children }: { children: ReactNode }) => {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [analysedAssetsFileName, setAnalysedAssetsFileName] = useState<
    string | null
  >(null)
  const [userAssets, setUserAssets] = useState<UserAssets>(null)
  const [analysedUserAssets, setAnalysedUserAssets] =
    useState<AnalysedUserAssets>(null)
  const [analysedAssetsWorkflowNickname, setAnalysedAssetsWorkflowNickname] =
    useState<string | null>(null)
  const [currentWorkflowNickname, setCurrentWorkflowNickname] = useState<
    string | null
  >(null)
  const [analysisRunDate, setAnalysisRunDate] = useState<string>()
  const [workflowJobIdAssociatedWithData, setWorkflowJobIdAssociatedWithData] =
    useState<string | null>(null)

  const [csvResults, setCsvResults] = useState<string | null>(null)
  const [analysedAssetsWorkflowTitle, setAnalysedAssetsWorkflowTitle] =
    useState<string | null>(null)
  const [currentWorkflowTitle, setCurrentWorkflowTitle] = useState<
    string | null
  >(null)
  const [areUserAssetsASamplePortfolio, setAreUserAssetsASamplePortfolio] =
    useState<boolean>(false)

  const { workspaceUserName, authenticatedAxios } = useContext(
    AuthenticationContext,
  )

  useEffect(
    function getCsvResults() {
      if (
        !authenticatedAxios ||
        !workflowJobIdAssociatedWithData ||
        !workspaceUserName ||
        analysedAssetsWorkflowNickname === HubWorkflowNicknames.OSC
      ) {
        return
      }

      setCsvResults(null)

      void authenticatedAxios
        .get(
          getCsvResultsUrl({
            workspaceUserName,
            jobId: workflowJobIdAssociatedWithData,
          }),
        )
        .then((response) => {
          setCsvResults(response.data)
        })
    },
    [
      analysedAssetsWorkflowNickname,
      authenticatedAxios,
      workflowJobIdAssociatedWithData,
      workspaceUserName,
    ],
  )

  return (
    <UserAssetsContext.Provider
      value={{
        analysedAssetsFileName,
        analysedAssetsWorkflowNickname,
        analysedAssetsWorkflowTitle,
        analysedUserAssets,
        analysisRunDate,
        areUserAssetsASamplePortfolio,
        csvResults,
        currentWorkflowNickname,
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
        workflowJobIdAssociatedWithData,
      }}
    >
      {children}
    </UserAssetsContext.Provider>
  )
}
