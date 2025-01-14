import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { AuthenticationContext } from './AuthenticationContext'
import {
  getUploadedFileList,
  UploadedFileInfo,
} from '../library/api/getUploadedFileList'
import { toast } from 'react-toastify'

interface PortfoliosContextValue {
  fileInfo: UploadedFileInfo[]
  isFileInfoLoading: boolean
  updateUploadedFilesList: () => void
}
export const PortfoliosContext = createContext<PortfoliosContextValue>({
  fileInfo: [],
  isFileInfoLoading: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updateUploadedFilesList: () => {},
})

export const PortfoliosContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [fileInfo, setFileInfo] = useState<UploadedFileInfo[]>([])
  const [isFileInfoLoading, setIsFileInfoLoading] = useState(true)

  const { authenticatedAxios, workspaceUserName } = useContext(
    AuthenticationContext,
  )
  const updateUploadedFilesList = useCallback(() => {
    if (!authenticatedAxios || !workspaceUserName) return

    setIsFileInfoLoading(true)
    getUploadedFileList({ authenticatedAxios, workspaceUserName })
      .then((response) => {
        setFileInfo(response || [])
      })
      .catch(() => {
        toast.error(
          "We're sorry. Something went wrong. Please try refreshing the page.",
        )
      })
      .finally(() => {
        setIsFileInfoLoading(false)
      })
  }, [authenticatedAxios, workspaceUserName])

  useEffect(
    function initializeUploadedFileList() {
      updateUploadedFilesList()
    },
    [updateUploadedFilesList],
  )

  return (
    <PortfoliosContext.Provider
      value={{ fileInfo, isFileInfoLoading, updateUploadedFilesList }}
    >
      {children}
    </PortfoliosContext.Provider>
  )
}
