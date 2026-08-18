import React, { useContext, useEffect, useState } from 'react'
import { Flex, Text, Tabs, Box, Table, Select, Button } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import {
  fetchWorkspaceCatalogs,
  getCatalogCollectionsPath,
  getCatalogKey,
} from '@/services/catalogService'
import { fetchCollections } from '@/services/collectionService'
import { fetchHarvestLogs, HarvestLogEntry } from '@/services/publisherService'
import { fetchWorkspaceProcesses } from '@/services/workspaceProcessesService'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import { MockVisibilitySelect } from '@/components/MockVisibilitySelect/MockVisibilitySelect'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { formatFileDateTime } from '@/library/fileUtils'
import styles from './PublisherPage.module.scss'

// #todo: there's no read or write API yet for a data file's visibility (public vs.
// private). See "Redesign the data-publishing flow and APIs" task note for the plan.
const VISIBILITY_TODO_TOOLTIP = '#todo: visibility is not readable or changeable via the API yet'

export const PublisherPage: React.FC = () => {
  const { token, currentWorkspace } = useContext(AuthenticationContext)
  const [activeTab, setActiveTab] = useState<'catalogue' | 'workflows' | 'data' | 'logs'>(
    'catalogue',
  )
  const [selectedCatalogKey, setSelectedCatalogKey] = useState<string | null>(null)

  const {
    data: catalogs,
    isLoading: catalogsLoading,
    error: catalogsError,
  } = useQuery({
    queryKey: ['WorkspaceCatalogs', currentWorkspace, token],
    queryFn: () => fetchWorkspaceCatalogs(currentWorkspace!, token!),
    enabled: Boolean(token && currentWorkspace && activeTab === 'catalogue'),
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!selectedCatalogKey && catalogs && catalogs.length > 0) {
      setSelectedCatalogKey(getCatalogKey(catalogs[0]))
    }
  }, [catalogs, selectedCatalogKey])

  const selectedCatalog = catalogs?.find((catalog) => getCatalogKey(catalog) === selectedCatalogKey)
  const collectionsPath = selectedCatalog ? getCatalogCollectionsPath(selectedCatalog) : null

  const {
    data: collections,
    isLoading: collectionsLoading,
    error: collectionsError,
  } = useQuery({
    queryKey: ['WorkspaceCollections', collectionsPath],
    queryFn: () => fetchCollections(collectionsPath!, 20, token),
    enabled: Boolean(collectionsPath && activeTab === 'catalogue'),
    refetchOnWindowFocus: false,
  })

  const {
    data: processes,
    isLoading: processesLoading,
    error: processesError,
  } = useQuery({
    queryKey: ['WorkspaceProcesses', currentWorkspace, token],
    queryFn: async () => {
      const workspaceTokens = await fetchWorkspaceTokens(currentWorkspace!, token!)
      return fetchWorkspaceProcesses(currentWorkspace!, workspaceTokens.access)
    },
    enabled: Boolean(token && currentWorkspace && activeTab === 'workflows'),
    refetchOnWindowFocus: false,
  })

  const {
    data: logs,
    isLoading: logsLoading,
    error: logsError,
  } = useQuery<HarvestLogEntry[]>({
    queryKey: ['HarvestLogs', currentWorkspace, token],
    queryFn: () => fetchHarvestLogs(currentWorkspace!, token!),
    enabled: Boolean(token && currentWorkspace && activeTab === 'logs'),
    refetchInterval: activeTab === 'logs' ? 10000 : false,
    refetchOnWindowFocus: false,
  })

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading
        title="Publisher"
        subtitle="Browse your workspace's catalogue, workflows and data, and control what's public."
      />

      {!token && <Callout type="info" message="Sign in to view publishing options." />}
      {token && !currentWorkspace && (
        <Callout type="info" message="Select a workspace to view publishing options." />
      )}

      {token && currentWorkspace && (
        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <Tabs.List>
            <Tabs.Trigger value="catalogue">Catalogue</Tabs.Trigger>
            <Tabs.Trigger value="workflows">Workflows</Tabs.Trigger>
            <Tabs.Trigger value="data">Data</Tabs.Trigger>
            <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
          </Tabs.List>

          <Box pt="5">
            <Tabs.Content value="catalogue">
              <Flex direction="column" gap="4">
                {catalogsLoading ? (
                  <LoadingIndicator size="3" />
                ) : catalogsError ? (
                  <Callout
                    type="error"
                    message={
                      catalogsError instanceof Error
                        ? catalogsError.message
                        : 'Failed to load catalogues.'
                    }
                  />
                ) : catalogs && catalogs.length > 0 ? (
                  <>
                    <Box maxWidth="360px">
                      <Select.Root
                        size="2"
                        value={selectedCatalogKey ?? undefined}
                        onValueChange={setSelectedCatalogKey}
                      >
                        <Select.Trigger
                          placeholder="Select a catalogue"
                          style={{ width: '100%' }}
                        />
                        <Select.Content position="popper">
                          <Select.Group>
                            {catalogs.map((catalog) => (
                              <Select.Item
                                key={getCatalogKey(catalog)}
                                value={getCatalogKey(catalog)}
                              >
                                {catalog.title ?? catalog.id}
                              </Select.Item>
                            ))}
                          </Select.Group>
                        </Select.Content>
                      </Select.Root>
                    </Box>

                    {collectionsLoading ? (
                      <LoadingIndicator size="3" />
                    ) : collectionsError ? (
                      <Callout
                        type="error"
                        message={
                          collectionsError instanceof Error
                            ? collectionsError.message
                            : 'Failed to load collections.'
                        }
                      />
                    ) : collections && collections.length > 0 ? (
                      <Table.Root className={styles.table}>
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Collection</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Visibility</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {collections.map((collection) => (
                            <Table.Row key={collection.id}>
                              <Table.Cell>
                                <Text size="2" weight="medium">
                                  {collection.title ?? collection.id}
                                </Text>
                              </Table.Cell>
                              <Table.Cell>
                                <MockVisibilitySelect
                                  storageKey={`mockVisibility:${currentWorkspace}:collection:${collectionsPath}:${collection.id}`}
                                  label={collection.title ?? collection.id}
                                />
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    ) : (
                      <Callout type="info" message="No collections found in this catalogue." />
                    )}
                  </>
                ) : (
                  <Callout type="info" message="No catalogues found for this workspace." />
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="workflows">
              {processesLoading ? (
                <LoadingIndicator size="3" />
              ) : processesError ? (
                <Callout
                  type="error"
                  message={
                    processesError instanceof Error
                      ? processesError.message
                      : 'Failed to load workflows.'
                  }
                />
              ) : processes && processes.length > 0 ? (
                <Table.Root className={styles.table}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Workflow</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Visibility</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {processes.map((process) => (
                      <Table.Row key={process.id}>
                        <Table.Cell>
                          <Text size="2" weight="medium">
                            {process.title ?? process.id}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <MockVisibilitySelect
                            storageKey={`mockVisibility:${currentWorkspace}:workflow:${process.id}`}
                            label={process.title ?? process.id}
                          />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              ) : (
                <Callout type="info" message="No workflows owned by this workspace." />
              )}
            </Tabs.Content>

            <Tabs.Content value="data">
              <Flex direction="column" gap="3">
                <Callout
                  type="info"
                  message={`Manage your workspace's data files on the Data Storage page. ${VISIBILITY_TODO_TOOLTIP}`}
                />
                <Box>
                  <Button asChild variant="soft">
                    <Link to="/my-data/data-storage">Go to Data Storage</Link>
                  </Button>
                </Box>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="logs">
              {logsLoading ? (
                <LoadingIndicator size="3" />
              ) : logsError ? (
                <Callout
                  type="error"
                  message={logsError instanceof Error ? logsError.message : 'Failed to load logs.'}
                />
              ) : logs && logs.length > 0 ? (
                <Box className={styles.logsBox}>
                  {logs.map((log, index) => (
                    <Text as="div" key={index} size="1" className={styles.logLine}>
                      [{formatFileDateTime(log.datetime)}] {log.message}
                    </Text>
                  ))}
                </Box>
              ) : (
                <Callout type="info" message="No logs to display." />
              )}
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      )}
    </Flex>
  )
}
