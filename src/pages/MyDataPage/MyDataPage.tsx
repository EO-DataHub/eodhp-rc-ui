import React, { useMemo, useState, useContext } from 'react'
import { Flex, Grid, Text, TextField, Tabs, Box, Link } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaceTokens } from '@/services/workspaceTokenService'
import { fetchUserCollections } from '@/services/collectionService'
import { UserCollectionCard } from '@/components/UserCollectionCard/UserCollectionCard'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { ChangeWokspaceModal } from '@/components/ChangeWokspaceModal/ChangeWokspaceModal'
import { Callout } from '@/components/Callout/Callout'
import { isCollectionMatchingSearch } from '@/library/collectionUtils'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import styles from './MyDataPage.module.scss'

export const MyDataPage: React.FC = () => {
  const { currentWorkspace, token } = useContext(AuthenticationContext)
  const [isChangeWokspaceModalOpen, setIsChangeWokspaceModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
  }

  const { data: workspaceTokensData } = useQuery({
    queryKey: ['WorkspaceTokens', currentWorkspace, token],
    queryFn: () => fetchWorkspaceTokens(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!token,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['UserCollections', currentWorkspace],
    queryFn: () => fetchUserCollections(currentWorkspace!, workspaceTokensData!.access),
    refetchOnWindowFocus: false,
    enabled: !!currentWorkspace && !!workspaceTokensData,
  })

  const sortedCollections = useMemo(() => {
    if (!data) return []

    // sort and filter base on search text
    return data
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
      .filter((collection) => {
        return isCollectionMatchingSearch(collection, searchText)
      })
  }, [data, searchText])

  return (
    <>
      <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
        <Flex direction="column" gap="3">
          <Text size="7" weight="medium">
            My Data
          </Text>
          <Flex gap="4">
            <Text size="3" weight="medium">
              Workspace: {currentWorkspace}
            </Text>
            <Link
              href="#"
              underline="always"
              weight="medium"
              onClick={(e) => {
                e.preventDefault()
                setIsChangeWokspaceModalOpen(true)
              }}
            >
              Change Workspace
            </Link>
          </Flex>
        </Flex>
        <Tabs.Root defaultValue="purchased_data">
          <Flex justify="between">
            <Tabs.List style={{ justifySelf: 'flex-start', fontSize: 16 }}>
              <Tabs.Trigger value="purchased_data">Purchased Data</Tabs.Trigger>
              <Tabs.Trigger value="workflow_outputs">Workflow Outputs</Tabs.Trigger>
            </Tabs.List>
            <TextField.Root
              placeholder="Search"
              value={searchText}
              onChange={handleChange}
              size="3"
            >
              <TextField.Slot>
                <MagnifyingGlassIcon />
              </TextField.Slot>
            </TextField.Root>
          </Flex>

          <Box pt="6">
            <Tabs.Content value="purchased_data">
              <Flex direction="column" gap="5" className={styles.collectionGrid}>
                {isLoading ? (
                  <LoadingIndicator size="3" />
                ) : (
                  (error ?? data?.length === 0) && (
                    <Callout
                      type="info"
                      message="You currently have no purchased data. Your order details will appear here once you make a purchase."
                    />
                  )
                )}
                <Grid
                  gap="5"
                  columns={{ lg: '3', md: '3', sm: '2' }}
                  width="auto"
                  className={styles.collectionGrid}
                >
                  {sortedCollections.map((collection) => (
                    <UserCollectionCard key={collection.id} collection={collection} />
                  ))}
                </Grid>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="workflow_outputs">
              <Callout type="info" message="Workflows are not currently supported." />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>

      <ChangeWokspaceModal
        isOpen={isChangeWokspaceModalOpen}
        onClose={() => setIsChangeWokspaceModalOpen(false)}
      />
    </>
  )
}
