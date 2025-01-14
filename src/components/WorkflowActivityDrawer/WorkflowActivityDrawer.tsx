import {
  Badge,
  BadgeProps,
  Heading,
  IconButton,
  Link,
  Spinner,
  Text,
} from '@radix-ui/themes'
import { useContext, useEffect, useState } from 'react'
import CloseIcon from '@material-design-icons/svg/filled/close.svg?react'

import { AuthenticationContext } from '../../context/AuthenticationContext'
import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import workflowActivityStyles from './WorkflowActivityDrawer.module.scss'
import { UserAssetsContext } from '../../context/UserAssetsContext'
import {
  hubWorkflowNames,
  workflowNickNamesByHubWorkflowName,
} from '../../configuration/constants'
import { getResultsUrl } from '../../library/api/getUrls'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Drawer } from '../Drawer/Drawer'
import { deleteWorkflow } from '../../library/api/deleteWorkflow'
import { Prompt } from '../Prompt/Prompt'

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL
const HUB_APP_WORKSPACE_NAME = import.meta.env.VITE_HUB_APP_WORKSPACE_NAME

interface WorkflowInfoFromApi {
  jobID: string
  started: string //date
  finished: string //date
  processID: string
  status: 'successful' | 'failed' | 'running'
  links: { title: 'Result location'; href: string }[]
}

const workflowsSupportedByThisApp = Object.values(hubWorkflowNames)

export const WorkflowActivityDrawer = ({
  closeDrawer,
  isDrawerOpen,
}: {
  closeDrawer: () => void
  isDrawerOpen: boolean
}) => {
  const [isWorkflowActivityError, setIsWorkflowActivityError] = useState(false)
  const [isWorkflowActivityLoading, setIsWorkflowActivityLoading] =
    useState(false)
  const [workflowActivity, setWorkflowActivity] = useState<
    WorkflowInfoFromApi[]
  >([])
  const [isActivityBeingCleared, setIsActivityBeingCleared] = useState(false)
  const navigate = useNavigate()

  const { authenticatedAxios, workspaceUserName } = useContext(
    AuthenticationContext,
  )
  const [analysisIdWaitingToBeViewed, setAnalysisIdWaitingToBeViewed] =
    useState<WorkflowInfoFromApi['jobID'] | undefined>(undefined)
  const {
    analysedUserAssets,
    setAnalysedAssetsFileName,
    setAnalysedAssetsWorkflowNickname,
    setAnalysedAssetsWorkflowTitle,
    setAnalysedUserAssets,
    setAnalysisRunDate,
    setWorkflowJobIdAssociatedWithData,
  } = useContext(UserAssetsContext)

  const loadWorkflowActivity = () => {
    if (!authenticatedAxios || !workspaceUserName) return

    if (isDrawerOpen) {
      setIsWorkflowActivityLoading(true)
      authenticatedAxios
        .get(`${HUB_BASE_URL}/ades/${HUB_APP_WORKSPACE_NAME}/ogc-api/jobs`)
        .then((response) => {
          const jobs = response.data.jobs as WorkflowInfoFromApi[]

          const jobsRelatedToWorkflowsInThisApp = jobs.filter(({ processID }) =>
            workflowsSupportedByThisApp.includes(processID),
          )

          const jobsSortedByDate = jobsRelatedToWorkflowsInThisApp.sort(
            (a: WorkflowInfoFromApi, b: WorkflowInfoFromApi) => {
              // UX requirement: show date analysis was started, or Date Error occurred or Date analysis was completed
              const dateStringToUseForA = a.finished ?? a.started
              const dateStringToUseForB = b.finished ?? b.started
              return new Date(dateStringToUseForB).getTime() >
                new Date(dateStringToUseForA).getTime()
                ? 1
                : -1
            },
          )
          setWorkflowActivity(jobsSortedByDate)
        })
        .catch(() => {
          setIsWorkflowActivityError(true)
        })
        .finally(() => {
          setIsWorkflowActivityLoading(false)
        })
    }
  }

  useEffect(
    loadWorkflowActivity,
    [authenticatedAxios, workspaceUserName, analysedUserAssets, isDrawerOpen], // we want to refresh whenever analysedUserAssets has changes which indicated a workflow status has changes
  )

  const viewAnalysis = (jobId: string) => {
    const jobInfo = workflowActivity.find((job) => job.jobID === jobId)
    if (
      !jobInfo ||
      !setAnalysisRunDate ||
      !setAnalysedAssetsFileName ||
      !setWorkflowJobIdAssociatedWithData ||
      !workspaceUserName
    ) {
      toast.error('Error viewing analysis')
      return
    }

    const resultsUrl = getResultsUrl({ workspaceUserName, jobId })

    const jobWorkflowNickname =
      workflowNickNamesByHubWorkflowName[jobInfo.processID]

    if (!jobWorkflowNickname || !resultsUrl) {
      toast.error('Error viewing analysis')
      return
    }

    setAnalysisIdWaitingToBeViewed(jobId)
    authenticatedAxios
      ?.get(resultsUrl)
      .then(({ data: { data } }) => {
        if (data) {
          setAnalysedUserAssets?.(data)
          setAnalysisRunDate(
            new Date(jobInfo.finished).toLocaleDateString('en-GB'),
          )
          setAnalysedAssetsFileName('placeholder-file-name')
          setWorkflowJobIdAssociatedWithData(jobId)
          setAnalysedAssetsWorkflowNickname?.(
            workflowNickNamesByHubWorkflowName[jobInfo.processID],
          )
          setAnalysedAssetsWorkflowTitle?.(
            workflowNickNamesByHubWorkflowName[jobInfo.processID] ?? null, // we can't currently get the workflow title, so we will use the nickname in the analysis page workflow title
          )
          closeDrawer()
          setTimeout(() => {
            // give react a second to update state so that table shows data - otherwise there is an issue with the analytics page where it doesnt update from context. Could be a react-table thing?
            navigate('/analytics')
          }, 1000)
        }
        if (!data) {
          toast.error('Error viewing analysis')
        }
      })
      .catch(() => {
        toast.error('Error viewing analysis')
      })
      .finally(() => {
        setAnalysisIdWaitingToBeViewed(undefined)
      })
  }
  const cancelAnalysis = (jobId: string) => {
    if (!authenticatedAxios || !workspaceUserName) return
    deleteWorkflow({
      jobId,
      authenticatedAxios,
    })
      .then(() => {
        loadWorkflowActivity()
        toast.dismiss()
        toast.success('Analysis cancelled.')
      })
      .catch(() => {
        toast.error('Error cancelling analysis.')
      })
  }

  const clearAll = () => {
    if (!authenticatedAxios || !workspaceUserName) return
    const deletePromises = workflowActivity.map(({ jobID }) =>
      deleteWorkflow({ jobId: jobID, authenticatedAxios }),
    )
    setIsActivityBeingCleared(true)
    Promise.all(deletePromises)
      .then(() => {
        setWorkflowActivity([])
        toast.dismiss()
        toast.success('All activity has been cleared.')
      })
      .catch(() => {
        toast.error('Error clearing activity.')
      })
      .finally(() => {
        setIsActivityBeingCleared(false)
      })
  }
  const badgeColor = {
    successful: 'green',
    failed: 'red',
    running: 'blue',
  }

  const badgeText = {
    successful: 'Analysis Complete',
    failed: 'Analysis Error',
    running: 'Analysis In-Progress',
  }

  return (
    <Drawer isDrawerOpen={isDrawerOpen}>
      <div className={workflowActivityStyles.drawerHeader}>
        <Heading as="h3">Activity</Heading>
        <IconButton
          aria-label="Close workflow activity drawer"
          variant="ghost"
          size="1"
        >
          <CloseIcon
            onClick={closeDrawer}
            aria-label="Close workflow activity drawer"
          />
        </IconButton>
      </div>

      <div className={workflowActivityStyles.activityList}>
        {!isWorkflowActivityLoading &&
        !isWorkflowActivityError &&
        workflowActivity.length > 0 ? (
          <div className={workflowActivityStyles.aboveActivityListRow}>
            <Link asChild size="1">
              <button
                className={workflowActivityStyles.workflowActivityButton}
                onClick={clearAll}
              >
                {isActivityBeingCleared ? <Spinner /> : null}
                Clear All
              </button>
            </Link>
          </div>
        ) : null}
        {isWorkflowActivityLoading ? <LoadingIndicator /> : null}
        {!isWorkflowActivityLoading &&
        !isWorkflowActivityError &&
        workflowActivity.length === 0 ? (
          <>There is no activity to show for the current user</>
        ) : null}
        {!isWorkflowActivityLoading && !isWorkflowActivityError
          ? workflowActivity.map(
              ({ jobID, status, started, finished, processID }) => {
                // UX requirement: show date analysis was started, or Date Error occurred or Date analysis was completed
                const dateStringToUse = finished ?? started
                return (
                  <div
                    key={jobID}
                    className={workflowActivityStyles.activityCard}
                  >
                    <Badge color={badgeColor[status] as BadgeProps['color']}>
                      {badgeText[status]}
                    </Badge>
                    <Text
                      weight="bold"
                      size="3"
                      className={workflowActivityStyles.portfolioName}
                    >
                      Portfolio Name Here
                    </Text>
                    <Text color="gray" size="1">
                      Type: {workflowNickNamesByHubWorkflowName[processID]}
                    </Text>
                    <div className={workflowActivityStyles.dateRow}>
                      <Text color="gray" size="1">
                        Date:
                        {dateStringToUse ? (
                          ` ${new Date(dateStringToUse).toLocaleDateString('en-GB')} ${new Date(dateStringToUse).toLocaleTimeString()}`
                        ) : (
                          <>unknown</>
                        )}
                      </Text>
                      {status === 'successful' ? (
                        <Link asChild size="1">
                          <button
                            onClick={() => viewAnalysis(jobID)}
                            className={
                              workflowActivityStyles.workflowActivityButton
                            }
                            disabled={!!analysisIdWaitingToBeViewed}
                          >
                            {analysisIdWaitingToBeViewed === jobID ? (
                              <Spinner />
                            ) : null}
                            View Analysis
                          </button>
                        </Link>
                      ) : null}
                      {status === 'running' &&
                      authenticatedAxios &&
                      workspaceUserName ? (
                        <Prompt
                          trigger={
                            <Link asChild size="1">
                              <button
                                className={
                                  workflowActivityStyles.workflowActivityButton
                                }
                              >
                                Cancel Analysis
                              </button>
                            </Link>
                          }
                          onConfirm={() => cancelAnalysis(jobID)}
                          promptText="Do you want to cancel the ongoing analysis?"
                        />
                      ) : null}
                    </div>
                  </div>
                )
              },
            )
          : null}
        {!isWorkflowActivityLoading && isWorkflowActivityError ? (
          <>
            We&apos;re sorry. Something went wrong when loading workflow
            activity information. You can try again by closing and opening this
            drawer.
          </>
        ) : null}
      </div>
    </Drawer>
  )
}
