import React, { useId } from 'react'
import { Flex, Text, VisuallyHidden } from '@radix-ui/themes'
import { SOURCE_LABELS, SOURCES, type WorkflowRun } from '@/hooks/useWorkflowRun'
import { plural } from '@/library/workflowRunInputs'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import styles from './WorkflowRun.module.scss'

interface RunSourceChoicesProps {
  run: WorkflowRun
}

/** The sources a run can use, with the reason a source cannot be used and the saved sets to pick. */
export const RunSourceChoices: React.FC<RunSourceChoicesProps> = ({ run }) => {
  const idPrefix = useId()
  const { source, setSource, setId, setSetId, savedSets } = run

  return (
    <fieldset className={styles.sourceList}>
      <VisuallyHidden asChild>
        <legend>Source</legend>
      </VisuallyHidden>
      {SOURCES.map((option) => {
        const reason = run.sourceUnavailableReason(option)
        const note = run.sourceNote(option)
        const hintId = `${idPrefix}-${option}-hint`
        return (
          <Flex key={option} direction="column" gap="1">
            <Text as="label" size="2" className={styles.sourceOption}>
              <input
                type="radio"
                name={`${idPrefix}-run-source`}
                value={option}
                checked={source === option}
                disabled={!!reason}
                aria-describedby={reason ? hintId : undefined}
                onChange={() => setSource(option)}
              />
              {SOURCE_LABELS[option]}
            </Text>
            {reason && (
              <Text id={hintId} size="1" color="gray" className={styles.sourceHint}>
                {reason}
              </Text>
            )}
            {!reason && note && (
              <Text size="1" color="gray" className={styles.sourceHint}>
                {note}
              </Text>
            )}
            {option === 'set' && source === 'set' && !reason && (
              <div className={styles.setList}>
                {savedSets.isLoading && <LoadingIndicator size="1" />}
                {savedSets.data?.map((summary) => (
                  <Text key={summary.id} as="label" size="2" className={styles.sourceOption}>
                    <input
                      type="radio"
                      name={`${idPrefix}-run-source-set`}
                      value={summary.id}
                      checked={setId === summary.id}
                      onChange={() => setSetId(summary.id)}
                    />
                    <span>{summary.name}</span>
                    <Text size="1" color="gray">
                      {plural(summary.itemCount, 'item')}
                    </Text>
                  </Text>
                ))}
              </div>
            )}
          </Flex>
        )
      })}
    </fieldset>
  )
}
