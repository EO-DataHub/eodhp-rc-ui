import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, Button, Flex, Text, TextField, Checkbox } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import type { ProcessRecord, Item, InputParameterEntry } from '@/types'
import { fetchItemById } from '@/services/processCatalogueService'
import { hasResolver } from '@/services/workflowVariableResolvers'
import type { Feature } from 'geojson'
import styles from './WorkflowLaunchModal.module.scss'

interface WorkflowLaunchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflow: ProcessRecord | null
  item: Item | null
  aoi: Feature | null | undefined
  launch: (
    includeAoi?: boolean,
    userProvidedVariables?: Record<string, string | number | boolean>,
  ) => Promise<void>
  isLaunching: boolean
  launchError: string | null
  workflowId: string | null
  currentWorkspace: string | undefined
}

function getDefaultValue(defaultVal: unknown): string {
  if (defaultVal === null || defaultVal === undefined) return ''
  if (
    typeof defaultVal === 'string' ||
    typeof defaultVal === 'number' ||
    typeof defaultVal === 'boolean'
  )
    return String(defaultVal)
  return ''
}

export const WorkflowLaunchModal: React.FC<WorkflowLaunchModalProps> = ({
  open,
  onOpenChange,
  workflow,
  aoi,
  launch,
  isLaunching,
  launchError,
  workflowId,
  currentWorkspace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [includeAoi, setIncludeAoi] = useState(true)
  const [userValues, setUserValues] = useState<Record<string, string>>({})
  const [workflowDetail, setWorkflowDetail] = useState<{
    inputParameters: Record<string, InputParameterEntry>
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const userInputParams =
    workflowDetail?.inputParameters &&
    Object.entries(workflowDetail.inputParameters).filter(
      ([paramKey, paramDef]) => !hasResolver(paramKey, paramDef),
    )

  // Fetch workflow detail when modal opens with a workflow
  useEffect(() => {
    if (!open || !workflow) {
      setWorkflowDetail(null)
      setDetailError(null)
      return
    }
    setDetailLoading(true)
    setDetailError(null)
    void fetchItemById(workflow.id)
      .then(({ data, error }) => {
        if (error != null || !data) {
          setDetailError(error ?? 'Could not load workflow details.')
          setWorkflowDetail(null)
          return
        }
        const inputParameters = data?.properties?.inputParameters ?? {}
        setWorkflowDetail({ inputParameters })
        setDetailError(null)
        const initial: Record<string, string> = {}
        Object.entries(inputParameters).forEach(([paramKey, paramDef]) => {
          if (!hasResolver(paramKey, paramDef)) {
            initial[paramKey] = getDefaultValue(paramDef.default)
          }
        })
        setUserValues(initial)
      })
      .finally(() => setDetailLoading(false))
  }, [open, workflow])

  useEffect(() => {
    if (aoi !== undefined && aoi !== null) {
      setIncludeAoi(true)
    }
  }, [aoi])

  const handleLaunch = () => {
    const userVars: Record<string, string | number | boolean> = {}
    Object.entries(userValues).forEach(([key, value]) => {
      const def = userInputParams?.find(([k]) => k === key)?.[1]
      const type = def?.type ?? 'string'
      if (type === 'number') {
        const n = Number(value)
        if (!Number.isNaN(n)) userVars[key] = n
        else userVars[key] = value
      } else if (type === 'boolean') {
        userVars[key] = value === 'true' || value === '1'
      } else {
        userVars[key] = value
      }
    })
    void launch(includeAoi, userVars)
  }

  // Show success view when we have a job id (from launch response); link to job details needs workspace too
  const showSuccess = !!workflowId

  if (!workflow) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="500px"
        className={styles.dialogContent}
        ref={containerRef}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          containerRef.current?.setAttribute('tabindex', '-1')
          containerRef.current?.focus()
        }}
      >
        <Dialog.Close>
          <Button variant="ghost" aria-label="Close" className={styles.closeButton} tabIndex={0}>
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="column" gap="4" className={styles.flexContainer}>
          {showSuccess ? (
            <>
              <Dialog.Title className={styles.dialogTitle}>Workflow launched</Dialog.Title>
              <Text size="2" color="gray">
                The workflow has been sent. It may take a while to complete. You can view the job
                status and results by clicking the button below. You can also view it at any time
                from the <strong>Workflow outputs</strong> page in My Data.
              </Text>
              <Flex direction="column" gap="2">
                {currentWorkspace ? (
                  <Button asChild size="2">
                    <Link to={`/my-data/workflow-outputs/${currentWorkspace}/${workflowId}`}>
                      View job details
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="2">
                    <Link to="/my-data/workflow-outputs">View workflow outputs</Link>
                  </Button>
                )}
                <Button color="gray" variant="soft" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </Flex>
            </>
          ) : (
            <>
              <Dialog.Title className={styles.dialogTitle}>Run workflow</Dialog.Title>
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">
                  {workflow.properties?.title ?? workflow.id}
                </Text>
                {workflow.properties?.description && (
                  <Text size="2" color="gray">
                    {workflow.properties.description}
                  </Text>
                )}
              </Flex>
              {detailLoading && (
                <Text size="2" color="gray">
                  Loading workflow options…
                </Text>
              )}
              {detailError && (
                <Text size="2" color="red">
                  {detailError}
                </Text>
              )}
              {!detailLoading && !detailError && workflowDetail && (
                <>
                  {userInputParams && userInputParams.length > 0 && (
                    <Flex direction="column" gap="3">
                      {userInputParams.map(([paramKey, paramDef]) => (
                        <div key={paramKey} className={styles.formField}>
                          <label>
                            <Text size="2" weight="medium" as="span">
                              {paramDef.label ?? paramKey}
                            </Text>
                            {paramDef.description && (
                              <Text size="1" color="gray" as="span" style={{ display: 'block' }}>
                                {paramDef.description}
                              </Text>
                            )}
                          </label>
                          {paramDef.type === 'date' ? (
                            <input
                              type="date"
                              value={userValues[paramKey] ?? ''}
                              onChange={(e) =>
                                setUserValues((prev) => ({ ...prev, [paramKey]: e.target.value }))
                              }
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--gray-7)',
                                fontSize: '14px',
                              }}
                            />
                          ) : (
                            <TextField.Root
                              type={paramDef.type === 'number' ? 'number' : 'text'}
                              value={userValues[paramKey] ?? ''}
                              onChange={(e) =>
                                setUserValues((prev) => ({ ...prev, [paramKey]: e.target.value }))
                              }
                              placeholder={getDefaultValue(paramDef.default) || undefined}
                              size="2"
                            />
                          )}
                        </div>
                      ))}
                    </Flex>
                  )}
                  {aoi && (
                    <Flex align="center" gap="2">
                      <Checkbox
                        checked={includeAoi}
                        onCheckedChange={(checked) => setIncludeAoi(Boolean(checked))}
                        size="2"
                      />
                      <Text
                        size="2"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setIncludeAoi(!includeAoi)}
                      >
                        Include Area of Interest (AOI)
                      </Text>
                    </Flex>
                  )}
                  {launchError && (
                    <Text size="2" color="red">
                      {launchError}
                    </Text>
                  )}
                  <Flex gap="2" justify="end">
                    <Button color="gray" variant="soft" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button disabled={isLaunching} onClick={() => void handleLaunch()}>
                      {isLaunching ? 'Running…' : 'Run workflow'}
                    </Button>
                  </Flex>
                </>
              )}
            </>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
