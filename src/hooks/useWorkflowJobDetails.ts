import { useContext, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchJobResults, fetchJobLog } from '@/services/workflowJobService'
import { fetchItemByUrl } from '@/services/itemService'
import { resolveApiUrl } from '@/services/apiUrlUtils'
import type { WorkflowJob, JobLink, Item } from '@/types'

interface UseWorkflowJobDetailsParams {
  job: WorkflowJob | null
  workspaceName?: string
}

interface JobResultsCollection {
  type?: string
  id?: string
  links?: {
    rel: string
    href: string
    type?: string
    title?: string
  }[]
  // allow additional fields without caring about their exact typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const isJobResultsCollection = (value: unknown): value is JobResultsCollection => {
  if (!value || typeof value !== 'object') return false
  const v = value as { links?: unknown }
  return Array.isArray(v.links)
}

export const useWorkflowJobDetails = ({ job, workspaceName }: UseWorkflowJobDetailsParams) => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)

  const effectiveWorkspace = workspaceName ?? currentWorkspace ?? ''

  const {
    data: workspaceTokens,
    isLoading: isLoadingWorkspaceToken,
    error: workspaceTokenError,
  } = useQuery({
    queryKey: ['WorkspaceTokens', effectiveWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(effectiveWorkspace, token!),
    enabled: !!job && !!effectiveWorkspace && !!token,
  })

  const resultsLink = useMemo(
    () =>
      job?.links.find((link) => link.rel === 'http://www.opengis.net/def/rel/ogc/1.0/results') ??
      null,
    [job],
  )

  const logLinks = useMemo(
    () =>
      (job?.links ?? []).filter((link) => {
        const hrefLower = link.href.toLowerCase()
        return hrefLower.endsWith('.log')
      }),
    [job],
  )

  const {
    data: resultsData,
    isLoading: isLoadingResults,
    error: resultsError,
  } = useQuery({
    queryKey: ['WorkflowJobResults', job?.id, resultsLink?.href, workspaceTokens?.access],
    queryFn: () => fetchJobResults(resultsLink!.href, workspaceTokens!.access),
    enabled: !!job && !!resultsLink?.href && !!workspaceTokens?.access,
  })

  const hasWorkspaceContext = !!effectiveWorkspace && !!token
  const resultsBlockedByWorkspaceContext = !!resultsLink && !hasWorkspaceContext

  const [selectedLog, setSelectedLog] = useState<JobLink | null>(null)
  const [logContent, setLogContent] = useState<string>('')
  const [isLoadingLog, setIsLoadingLog] = useState(false)
  const [logError, setLogError] = useState<Error | null>(null)
  const [assetError, setAssetError] = useState<Error | null>(null)

  const itemLinks = useMemo(
    () =>
      isJobResultsCollection(resultsData)
        ? (resultsData.links ?? []).filter((link) => link.rel === 'item')
        : [],
    [resultsData],
  )

  const firstItemLink = itemLinks[0] ?? null

  const {
    data: resultItem,
    isLoading: isLoadingItem,
    error: itemError,
  } = useQuery<Item>({
    queryKey: ['WorkflowJobResultItem', job?.id, firstItemLink?.href, workspaceTokens?.access],
    queryFn: () => {
      if (!firstItemLink?.href || !workspaceTokens?.access) {
        throw new Error('Missing result item link or workspace token.')
      }
      return fetchItemByUrl({
        itemUrl: firstItemLink.href,
        workspaceToken: workspaceTokens.access,
      })
    },
    enabled: !!job && !!firstItemLink?.href && !!workspaceTokens?.access,
  })

  const handleViewLog = async (link: JobLink) => {
    if (!workspaceTokens?.access) return
    setSelectedLog(link)
    setIsLoadingLog(true)
    setLogError(null)
    setLogContent('')

    try {
      const content = await fetchJobLog(link.href, workspaceTokens.access)
      setLogContent(content)
    } catch (error) {
      if (error instanceof Error) {
        setLogError(error)
      } else {
        setLogError(new Error('Failed to fetch log'))
      }
    } finally {
      setIsLoadingLog(false)
    }
  }

  const handleDownloadAsset = async (href: string) => {
    if (!workspaceTokens?.access) return

    setAssetError(null)

    try {
      const url = resolveApiUrl(href)

      const headers: HeadersInit = {}
      // Always attach Authorization for HTTPS URLs when a workspace token is present
      if (url.protocol === 'https:' && workspaceTokens.access) {
        headers.Authorization = `Bearer ${workspaceTokens.access}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to download asset')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      const fileName = href.split('/').pop() ?? 'download'
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      if (error instanceof Error) {
        setAssetError(error)
      } else {
        setAssetError(new Error('Failed to download asset'))
      }
    }
  }

  return {
    isLoadingWorkspaceToken,
    workspaceTokenError,
    // results
    resultsLink,
    resultsData,
    isLoadingResults,
    resultsError,
    resultsBlockedByWorkspaceContext,
    // result item
    firstItemLink,
    resultItem,
    isLoadingItem,
    itemError,
    // logs
    logLinks,
    selectedLog,
    logContent,
    isLoadingLog,
    logError,
    // asset downloads
    assetError,
    // actions
    handleViewLog,
    handleDownloadAsset,
  }
}
