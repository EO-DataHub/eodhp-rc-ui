import React from 'react'
import { Callout, Checkbox, DataList, Flex, Text } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { SOURCE_LABELS, type WorkflowRun } from '@/hooks/useWorkflowRun'
import { inputLabel, plural } from '@/library/workflowRunInputs'
import { MAX_JOBS_PER_RUN } from '@/constants/workflowRunLimits'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'

interface RunReviewProps {
  run: WorkflowRun
  /** What to tell the user when the single item to run on has no link. */
  itemWithoutLinkHint?: string
  /** Shown in place of the job count sentence, for a single item too. */
  summary?: React.ReactNode
}

/** What the run will do, the job count and anything that stops the run. */
export const RunReview: React.FC<RunReviewProps> = ({
  run,
  itemWithoutLinkHint = 'Choose a different item.',
  summary,
}) => {
  const {
    workflowTitle,
    isSingleItem,
    item,
    source,
    inputs,
    inputValueText,
    workspace,
    items,
    resultsCapped,
    resultsCapText,
    needsConfirmation,
    aboveCeiling,
    confirmed,
    setConfirmed,
    itemInputs,
    itemsWithoutLink,
    privateItemCount,
    launchError,
  } = run

  return (
    <Flex direction="column" gap="4">
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>Workflow</DataList.Label>
          <DataList.Value>{workflowTitle}</DataList.Value>
        </DataList.Item>
        {isSingleItem ? (
          <DataList.Item>
            <DataList.Label>Item</DataList.Label>
            <DataList.Value>{item?.id}</DataList.Value>
          </DataList.Item>
        ) : (
          <DataList.Item>
            <DataList.Label>Run on</DataList.Label>
            <DataList.Value>{SOURCE_LABELS[source]}</DataList.Value>
          </DataList.Item>
        )}
        {Object.entries(inputs).map(([key, def]) => (
          <DataList.Item key={key}>
            <DataList.Label>{inputLabel(key, def)}</DataList.Label>
            <DataList.Value>{inputValueText(key, def)}</DataList.Value>
          </DataList.Item>
        ))}
        <DataList.Item>
          <DataList.Label>Workspace</DataList.Label>
          <DataList.Value>
            {workspace
              ? `${workspace} (${isSingleItem ? 'the job runs' : 'the jobs run'} here)`
              : 'None'}
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>

      {(!isSingleItem || summary !== undefined) &&
        (items ? (
          <Flex direction="column" gap="2">
            {summary ?? (
              <Text size="2">
                This starts <strong>{plural(items.length, 'job')}</strong>, one for each item.
              </Text>
            )}
            {source === 'results' && resultsCapped && (
              <Text size="2" color="gray">
                {resultsCapText}
              </Text>
            )}
            {needsConfirmation && !aboveCeiling && (
              <Text as="label" size="2">
                <Flex gap="2" align="center">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked === true)}
                  />
                  {`Yes, start ${plural(items.length, 'job')}`}
                </Flex>
              </Text>
            )}
          </Flex>
        ) : (
          <Flex gap="2" align="center">
            <LoadingIndicator size="1" />
            <Text size="2">Loading the items…</Text>
          </Flex>
        ))}

      {!workspace && (
        <Callout.Root color="amber" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Select a workspace to run this workflow.</Callout.Text>
        </Callout.Root>
      )}
      {itemsWithoutLink.length > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            The Hub cannot fill in {itemInputs.map(([key, def]) => inputLabel(key, def)).join(', ')}{' '}
            because{' '}
            {isSingleItem
              ? `this item has no link. ${itemWithoutLinkHint}`
              : `${plural(itemsWithoutLink.length, 'item')} ${itemsWithoutLink.length === 1 ? 'has' : 'have'} no link: ${itemsWithoutLink.map((target) => target.id).join(', ')}.`}
          </Callout.Text>
        </Callout.Root>
      )}
      {aboveCeiling && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {`A run can start at most ${MAX_JOBS_PER_RUN} jobs. Choose fewer items to run on.`}
          </Callout.Text>
        </Callout.Root>
      )}
      {privateItemCount > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {`${workflowTitle} cannot read private data, and ${
              privateItemCount === 1 ? '1 item is private' : `${privateItemCount} items are private`
            }. Choose public items only.`}
          </Callout.Text>
        </Callout.Root>
      )}
      {items?.length === 0 && (
        <Callout.Root color="amber" size="1">
          <Callout.Text>There are no items to run on.</Callout.Text>
        </Callout.Root>
      )}
      {launchError && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{launchError}</Callout.Text>
        </Callout.Root>
      )}
    </Flex>
  )
}
