import React, { useId } from 'react'
import { Callout, Checkbox, DataList, Flex, Text, TextField } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
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
import { OpenSetOnMapButton } from '@/components/SavedSets/OpenSetOnMapButton'
import { AreaPreview } from './AreaPreview'
import styles from './WorkflowRun.module.scss'

/** The inputs of a run: what the Hub fills in, the area of interest and the fields the user sets. */
export const RunInputs: React.FC<{ run: WorkflowRun }> = ({ run }) => {
  const idPrefix = useId()
  const {
    inputs,
    values,
    setValue,
    hubValueText,
    aoi: area,
    includeAoi,
    areaLocked,
    setIncludeAoi,
    outsideDataFinder,
    missingRequiredArea,
    chosenSet,
    workflowTitle,
  } = run
  const hubInputs = getHubInputs(inputs)
  const userInputs = getUserInputs(inputs)
  // Outside the Data Finder there is no area to draw, so only a drawn area is offered
  const showAreaCheckbox = hasAreaInput(inputs) && (!outsideDataFinder || !!area)

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

      {showAreaCheckbox && (
        <Flex direction="column" gap="2">
          <Text as="label" size="2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={!!area && includeAoi}
                disabled={!area || areaLocked}
                onCheckedChange={(checked) => setIncludeAoi(checked === true)}
              />
              {outsideDataFinder ? 'Use the area drawn on the map' : 'Include area of interest'}
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

      {missingRequiredArea && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2" align="start">
            <Callout.Text>
              {`${workflowTitle} needs an area, and no area is drawn on the map. `}
              {chosenSet
                ? 'Open the set on the map, draw an area, then run the workflow from there.'
                : 'Draw an area on the map, then run the workflow again.'}
            </Callout.Text>
            {chosenSet && (
              <OpenSetOnMapButton
                setId={chosenSet.id}
                setName={chosenSet.name}
                label="Open the set on the map"
                size="1"
              />
            )}
          </Flex>
        </Callout.Root>
      )}
    </Flex>
  )
}
