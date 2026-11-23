import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useSelector } from '@xstate/store/react'
import { Button, Checkbox, Flex, Heading, Text } from '@radix-ui/themes'
import type { ProcessRecord } from '@/types'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useNotebookLaunch } from '@/hooks/useNotebookLaunch'
import { getHubApiOrigin, toolAppliesTo } from '@/library/integrationTools'

// The notebook is passed in, so the hook fetches no list to filter
const anyNotebook = () => true

/**
 * Opens a notebook in Jupyter with the item chosen on a card. The item follows the cards'
 * Open in buttons through the store.
 */
export const NotebookLaunchForm: React.FC<{ tool: ProcessRecord }> = ({ tool }) => {
  const { isAuthenticated, currentWorkspace, token, userInfo } = useContext(AuthenticationContext)
  const runItem = useSelector(dataFinderStore, (state) => state.context.runItem)
  // An item chosen for another tool may be from a dataset this notebook does not open
  const item = runItem && toolAppliesTo(tool, runItem.collection) ? runItem : undefined
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const title = tool.properties.title

  const [includeAoi, setIncludeAoi] = useState(!!aoi)
  useEffect(() => {
    setIncludeAoi(!!aoi)
  }, [aoi])

  const context = useMemo(
    () =>
      item
        ? {
            item,
            aoi,
            includeAoi,
            workspace: currentWorkspace,
            apiBaseUrl: getHubApiOrigin(),
          }
        : null,
    [item, aoi, includeAoi, currentWorkspace],
  )

  const { launch, isLaunching, launchError } = useNotebookLaunch({
    enabled: !!item,
    filterNotebooks: anyNotebook,
    notebook: tool,
    context,
    token,
    currentWorkspace,
    username: userInfo?.preferred_username,
  })

  if (!item) {
    return (
      <Text size="2" color="gray">
        Choose an item, then select Open in {title} on its card.
      </Text>
    )
  }

  const canLaunch = isAuthenticated && !!currentWorkspace && !isLaunching

  return (
    <Flex direction="column" gap="4">
      <Flex asChild direction="column" gap="2">
        <section>
          <Heading as="h3" size="2">
            Item
          </Heading>
          <Text size="2" style={{ wordBreak: 'break-all' }}>
            {item.id}
          </Text>
          <Text size="1" color="gray">
            To open another item, select Open in {title} on its card.
          </Text>
        </section>
      </Flex>
      {aoi && (
        <Text as="label" size="2">
          <Flex align="center" gap="2">
            <Checkbox
              checked={includeAoi}
              onCheckedChange={(checked) => setIncludeAoi(Boolean(checked))}
            />
            Include Area of Interest (AOI)
          </Flex>
        </Text>
      )}
      {!isAuthenticated || !currentWorkspace ? (
        <Text size="2" color="gray">
          Log in and select a workspace to launch this notebook.
        </Text>
      ) : null}
      <Button disabled={!canLaunch} onClick={() => void launch()}>
        {isLaunching ? 'Launching...' : 'Launch'}
      </Button>
      {launchError && (
        <Text size="2" color="red" role="alert">
          {launchError}
        </Text>
      )}
    </Flex>
  )
}
