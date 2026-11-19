import React from 'react'
import { Button, Callout, Flex, Text } from '@radix-ui/themes'
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons'
import type { WorkflowRun } from '@/hooks/useWorkflowRun'
import { plural } from '@/library/workflowRunInputs'
import styles from './WorkflowRun.module.scss'

interface RunStartedProps {
  run: WorkflowRun
  /** Buttons shown after Retry these. */
  actions?: React.ReactNode
}

/** The jobs a run started, the jobs that failed to start, and a way to retry them. */
export const RunStarted: React.FC<RunStartedProps> = ({ run, actions }) => {
  const { singleJobStarted, startedJobs, failedJobs, launchError, isLaunching, retryFailed } = run

  return (
    <Flex direction="column" gap="4">
      {singleJobStarted ? (
        <Callout.Root color="green">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            You can follow the job in <strong>My data → Workflow outputs</strong>.
          </Callout.Text>
        </Callout.Root>
      ) : (
        <>
          {startedJobs.length > 0 && (
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                <strong>{`${plural(startedJobs.length, 'job')} started`}</strong>. You can follow
                them in <strong>My data → Workflow outputs</strong>.
              </Callout.Text>
            </Callout.Root>
          )}
          {failedJobs.length > 0 && (
            <Callout.Root color="red">
              <Callout.Icon>
                <CrossCircledIcon />
              </Callout.Icon>
              <Flex direction="column" gap="2">
                <Callout.Text>
                  <strong>{`${failedJobs.length} failed to start:`}</strong>
                </Callout.Text>
                <ul className={styles.failedList}>
                  {failedJobs.map(({ item: failedItem, error }) => (
                    <li key={failedItem.id}>
                      <Text size="2">
                        <strong>{failedItem.id}</strong>: {error}
                      </Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Callout.Root>
          )}
          {launchError && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{launchError}</Callout.Text>
            </Callout.Root>
          )}
        </>
      )}
      <Flex justify="end" gap="3">
        {failedJobs.length > 0 && (
          <Button
            variant="soft"
            color="red"
            disabled={isLaunching}
            onClick={() => void retryFailed()}
          >
            {isLaunching ? 'Retrying…' : 'Retry these'}
          </Button>
        )}
        {actions}
      </Flex>
    </Flex>
  )
}
