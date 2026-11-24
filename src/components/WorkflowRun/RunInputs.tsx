import React, { useId } from 'react'
import { Checkbox, DataList, Flex, Text, TextField } from '@radix-ui/themes'
import type { WorkflowRun } from '@/hooks/useWorkflowRun'
import {
  getHubInputs,
  getUserInputs,
  hasAreaInput,
  inputLabel,
  isDateInput,
  isDateRangeInput,
  joinDateRange,
  splitDateRange,
} from '@/library/workflowRunInputs'
import { AreaPreview } from './AreaPreview'
import styles from './WorkflowRun.module.scss'

/** The inputs of a run: what the Hub fills in, the area of interest and the fields the user sets. */
export const RunInputs: React.FC<{ run: WorkflowRun }> = ({ run }) => {
  const idPrefix = useId()
  const { inputs, values, setValue, hubValueText, aoi: area, includeAoi, setIncludeAoi } = run
  const hubInputs = getHubInputs(inputs)
  const userInputs = getUserInputs(inputs)

  return (
    <Flex direction="column" gap="4">
      {hubInputs.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Filled in by the Hub
          </Text>
          <DataList.Root>
            {hubInputs.map(([key, def]) => (
              <DataList.Item key={key}>
                <DataList.Label>{inputLabel(key, def)}</DataList.Label>
                <DataList.Value>{hubValueText(key, def)}</DataList.Value>
              </DataList.Item>
            ))}
          </DataList.Root>
        </Flex>
      )}

      {hasAreaInput(inputs) && (
        <Flex direction="column" gap="2">
          <Text as="label" size="2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={!!area && includeAoi}
                disabled={!area}
                onCheckedChange={(checked) => setIncludeAoi(checked === true)}
              />
              Include area of interest
            </Flex>
          </Text>
          {area ? (
            <AreaPreview area={area} />
          ) : (
            <Text size="1" color="gray">
              Draw an area on the map to include it.
            </Text>
          )}
        </Flex>
      )}

      {userInputs.map(([key, def]) => {
        const id = `${idPrefix}-${key}`
        if (isDateRangeInput(def)) {
          const [start, end] = splitDateRange(values[key] ?? '')
          return (
            <fieldset key={key} className={styles.dateRange}>
              <Text size="2" weight="medium" asChild>
                <legend>{inputLabel(key, def)}</legend>
              </Text>
              {def.description && (
                <Text size="1" color="gray">
                  {def.description}
                </Text>
              )}
              <Flex gap="3" align="end">
                <div className={styles.formField}>
                  <Text as="label" htmlFor={`${id}-start`} size="1" color="gray">
                    From
                  </Text>
                  <TextField.Root
                    id={`${id}-start`}
                    type="date"
                    value={start}
                    max={end || undefined}
                    onChange={(e) => setValue(key, joinDateRange(e.target.value, end))}
                    size="2"
                  />
                </div>
                <div className={styles.formField}>
                  <Text as="label" htmlFor={`${id}-end`} size="1" color="gray">
                    To
                  </Text>
                  <TextField.Root
                    id={`${id}-end`}
                    type="date"
                    value={end}
                    min={start || undefined}
                    onChange={(e) => setValue(key, joinDateRange(start, e.target.value))}
                    size="2"
                  />
                </div>
              </Flex>
              {!!start !== !!end && (
                <Text size="1" color="red">
                  Set both dates, or neither.
                </Text>
              )}
            </fieldset>
          )
        }
        return (
          <div key={key} className={styles.formField}>
            <Text as="label" htmlFor={id} size="2" weight="medium">
              {inputLabel(key, def)}
            </Text>
            {def.description && (
              <Text size="1" color="gray">
                {def.description}
              </Text>
            )}
            <TextField.Root
              id={id}
              type={def.type === 'number' ? 'number' : isDateInput(def) ? 'date' : 'text'}
              value={values[key] ?? ''}
              onChange={(e) => setValue(key, e.target.value)}
              size="2"
            />
          </div>
        )
      })}
    </Flex>
  )
}
