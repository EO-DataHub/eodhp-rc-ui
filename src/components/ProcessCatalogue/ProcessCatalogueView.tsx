import React from 'react'
import { Container, Flex, Text, Separator, Box, Grid, Button } from '@radix-ui/themes'
import type { ProcessRecord } from '@/types'
import { ProcessCard } from '@/components/ProcessCard/ProcessCard'
import styles from './ProcessCatalogueView.module.scss'

export interface ProcessCatalogueViewProps {
  title?: string
  /** Optional short description or subtitle shown below the title */
  subtitle?: string
  headerActions?: React.ReactNode
  filters?: React.ReactNode
  items: ProcessRecord[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  page?: number
  totalPages?: number
  totalItems?: number
  onPageChange?: (page: number) => void
  emptyMessage?: React.ReactNode
  loadingMessage?: React.ReactNode
}

/**
 * Shared presentation layer for displaying paginated process/notebook cards.
 * Consumers (e.g., the processes catalogue page or an item info panel) can supply
 * their own data source, filters, and header actions.
 */
export const ProcessCatalogueView: React.FC<ProcessCatalogueViewProps> = ({
  title = 'Processes Catalogue',
  subtitle,
  headerActions,
  filters,
  items,
  isLoading = false,
  error,
  onRetry,
  page = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  emptyMessage,
  loadingMessage,
}) => {
  if (isLoading && items.length === 0) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
        <Text>{loadingMessage ?? 'Loading processes…'}</Text>
      </Flex>
    )
  }

  if (error && items.length === 0) {
    return (
      <Container align="center" maxWidth="1640px">
        <Flex direction="column" gap="4" p="6" align="center">
          <Text color="red">{error}</Text>
          {onRetry ? (
            <Button onClick={onRetry} variant="soft">
              Retry
            </Button>
          ) : null}
        </Flex>
      </Container>
    )
  }

  const emitPageChange = (nextPage: number): void => {
    if (onPageChange) {
      onPageChange(nextPage)
    }
  }

  const hasPagination = totalPages > 1 && Boolean(onPageChange)

  return (
    <Container align="center" maxWidth="1640px">
      <Flex p="5" direction="column" gap="1" width="100%">
        <Flex align="center" justify="between" width="100%">
          <Text size="7" weight="medium">
            {title}
          </Text>
          {headerActions}
        </Flex>
        {subtitle ? (
          <Text size="2" color="gray">
            {subtitle}
          </Text>
        ) : null}
      </Flex>
      <Separator style={{ width: '100%' }} />
      {filters ? (
        <Box px="5" py="3" width="100%">
          {filters}
        </Box>
      ) : null}

      {items.length === 0 ? (
        <Box p="5">
          {emptyMessage ?? (
            <Text>No workflows or notebooks found. Try adjusting your filters or search.</Text>
          )}
        </Box>
      ) : (
        <>
          <Grid
            p="5"
            gap="5"
            columns={{ lg: '4', md: '3', sm: '2' }}
            width="auto"
            className={styles.collectionGrid}
          >
            {items.map((record) => (
              <ProcessCard key={record.id} record={record} />
            ))}
          </Grid>
          {hasPagination ? (
            <Flex justify="center" gap="2" p="4">
              <Button
                variant="soft"
                size="1"
                disabled={page <= 1}
                onClick={() => emitPageChange(Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Text size="2" as="span" style={{ alignSelf: 'center' }}>
                Page {page} of {totalPages}
                {typeof totalItems === 'number' ? ` (${totalItems} items)` : ''}
              </Text>
              <Button
                variant="soft"
                size="1"
                disabled={page >= totalPages}
                onClick={() => emitPageChange(Math.min(totalPages, page + 1))}
              >
                Next
              </Button>
            </Flex>
          ) : null}
        </>
      )}
    </Container>
  )
}
