import { Box, Flex, Grid, IconButton, Select, Text } from '@radix-ui/themes'
import { MAX_TOTAL_ITEMS, PAGE_SIZE } from '@/pages/DataFinderPage/DataFinderPage'
import styles from './QueryItems.module.scss'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import FilterAltOutlined from '@/assets/icons/filter-alt-outlined.svg?react'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

/* eslint-disable no-console */

const PaginationContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex justify="center" className={styles.paginationContainer}>
      {children}
    </Flex>
  )
}

const PageIndicator = ({ page, totalItemsCount }: { page: number; totalItemsCount: number }) => {
  const totalCountLabel =
    totalItemsCount >= MAX_TOTAL_ITEMS ? `${MAX_TOTAL_ITEMS}+` : totalItemsCount
  const startItem = page * PAGE_SIZE + 1
  const endItem = Math.min((page + 1) * PAGE_SIZE, totalItemsCount)
  return (
    <Text size="2" weight="bold">
      {`${startItem}-${endItem} of ${totalCountLabel}`}
    </Text>
  )
}

const RenderSelectionButton = () => {
  const isLoading = useSelector(dataFinderStore, ({ context }) => context.isLoading)
  const collectionRenderOptions = useSelector(
    dataFinderStore,
    ({ context }) => context.collectionRenderOptions,
  )
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)

  if (isLoading || !collectionRenderOptions.length || !collectionRender) {
    return null
  }

  return (
    <Flex py="var(--Spacing-3, 12px)">
      <Select.Root
        value={collectionRender.id}
        onValueChange={(renderId) =>
          dataFinderStore.send({
            type: 'setCollectionRender',
            collectionRender: collectionRenderOptions.find((r) => r.id === renderId),
          })
        }
      >
        <Select.Trigger
          style={{
            width: '100%',
          }}
        />
        <Select.Content>
          <Select.Group>
            {collectionRenderOptions.map((option) => (
              <Select.Item key={option.id} value={option.id}>
                {option.title ?? option.id}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </Flex>
  )
}

const QueryItemsTab = () => {
  const isFetching = false
  const page = 0
  const items = []
  const toggleFilterPanel = () => {
    console.log('toggleFilterPanel')
  }
  const hasPages = true

  const pageCount = Math.ceil(items.length / PAGE_SIZE)
  const setPage = (page: number) => {
    console.log('page', page)
  }

  return (
    <Grid
      style={{
        backgroundColor: 'pink',
        gridTemplateRows: 'auto auto 1fr auto',
        overflow: 'hidden',
        flexGrow: 1,
      }}
    >
      <RenderSelectionButton />
      <Flex justify="between" mt="2">
        <Flex align="center" gap="2">
          {isFetching && (
            <>
              <LoadingIndicator />
              <Text size="2">Loading...</Text>
            </>
          )}
        </Flex>
        <Flex width="100%" gap="2" align="center">
          {hasPages && <PageIndicator page={page} totalItemsCount={items.length} />}
        </Flex>
        <Flex gap="2" align="center">
          <IconButton size="2" color="gray" variant="outline" onClick={toggleFilterPanel}>
            <FilterAltOutlined />
          </IconButton>
        </Flex>
      </Flex>

      <Flex
        direction={'column'}
        style={{ backgroundColor: 'blue', overflowY: 'auto', flexGrow: 1 }}
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <Box key={i} style={{ backgroundColor: 'yellow' }}>
            Item {i}
          </Box>
        ))}
      </Flex>

      {hasPages && (
        <PaginationContainer>
          <PageSelector
            currentPageIndex={page}
            nextDisabled={page === pageCount - 1}
            onGoToPage={setPage}
            onNextClick={() => setPage(page + 1)}
            onPreviousClick={() => setPage(page - 1)}
            pageCount={pageCount}
            previousDisabled={page === 0}
          />
        </PaginationContainer>
      )}
    </Grid>
  )
}

export default QueryItemsTab
