import { Flex, Grid, IconButton, Select, Text } from '@radix-ui/themes'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import FilterAltOutlined from '@/assets/icons/filter-alt-outlined.svg?react'
import { PageSelector } from '@/components/Pagination/PageSelector/PageSelector'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import useItemsQuery, { MAX_TOTAL_ITEMS, PAGE_SIZE } from '@/hooks/useItemsQuery'
import ItemList from '../ItemList'
import ItemCard from './ItemCard'

const PaginationContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex justify="center" mt="auto">
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
  const collectionRenderOptions = useSelector(
    dataFinderStore,
    ({ context }) => context.collectionRenderOptions,
  )
  const collectionRender = useSelector(dataFinderStore, ({ context }) => context.collectionRender)

  if (!collectionRenderOptions.length || !collectionRender) {
    return null
  }

  return (
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
  )
}

const QueryItemsTab = () => {
  const isLoading = useSelector(dataFinderStore, ({ context }) => context.isLoading)
  const secondaryPanel = useSelector(dataFinderStore, ({ context }) => context.secondaryPanel)

  const { allItems, pageItems, isFetching, hasPages, page, pageCount, error } = useItemsQuery()

  const toggleQueryFiltersPanel = () => {
    dataFinderStore.send({
      type: 'setSecondaryPanel',
      panel: secondaryPanel === 'query-filters' ? undefined : 'query-filters',
    })
  }

  const setPage = (newPage: number) => {
    dataFinderStore.send({ type: 'pageChange', page: newPage })
  }

  return (
    <Grid
      style={{
        gridTemplateRows: 'auto auto 1fr auto',
        overflow: 'hidden',
        flexGrow: 1,
        gap: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
      }}
    >
      {!isLoading && <RenderSelectionButton />}
      <Flex justify="between">
        <Flex align="center" gap="2">
          {isFetching && (
            <>
              <LoadingIndicator />
              <Text size="2">Loading...</Text>
            </>
          )}
        </Flex>
        <Flex width="100%" gap="2" align="center">
          {hasPages && <PageIndicator page={page} totalItemsCount={allItems.length} />}
        </Flex>
        <Flex gap="2" align="center">
          <IconButton size="2" color="gray" variant="outline" onClick={toggleQueryFiltersPanel}>
            <FilterAltOutlined />
          </IconButton>
        </Flex>
      </Flex>

      <Flex direction="column" style={{ overflowY: 'auto', flexGrow: 1 }}>
        {!isLoading && (
          <ItemList
            cardType="query-item"
            items={pageItems}
            error={!!error}
            renderItem={(item) => (
              <ItemCard key={`query-item-${item.id}`} item={item} type="query-item" />
            )}
          />
        )}
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
