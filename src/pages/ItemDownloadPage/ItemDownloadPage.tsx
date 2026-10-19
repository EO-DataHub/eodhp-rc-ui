import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { Button, Flex, Link } from '@radix-ui/themes'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useCollectionFromPath } from '@/hooks/useCollectionFromPath'
import { useAnalyticsActions } from '@/hooks/useGoogleAnalyticsActions'
import { parseItemDownloadSearch } from '@/library/catalogUtils'
import { fetchItem } from '@/services/itemService'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { ItemDownloads } from '@/components/ItemDownloads/ItemDownloads'
import styles from '../MyDataPage/MyDataPage.module.scss'

export const ItemDownloadPage: React.FC = () => {
  const { login } = useContext(AuthenticationContext)
  const params = useParams<{ '*': string }>()
  const collectionPath = params['*'] ?? ''
  const [searchParams] = useSearchParams()
  const { itemId, workspace: workspaceParam, from } = parseItemDownloadSearch(searchParams)
  const { trackViewItemDownloads } = useAnalyticsActions()

  const { status, collection, parsedPath, workspace, workspaceToken } = useCollectionFromPath(
    collectionPath,
    { workspace: workspaceParam },
  )
  const isPrivate = !!parsedPath && parsedPath.type !== 'public'
  const collectionUrl = collection?.links.find((link) => link.rel === 'self')?.href

  const itemQuery = useQuery({
    queryKey: ['ItemDownload', collectionUrl, itemId, workspace],
    // collectionUrl is the self link from the hub's own collection listing, not user input,
    // so the token can go with it (as in ItemInfoPanel)
    queryFn: () =>
      fetchItem({
        collectionUrl,
        itemId: encodeURIComponent(itemId!),
        workspaceToken,
      }),
    refetchOnWindowFocus: false,
    retry: false,
    enabled: status === 'found' && !!collectionUrl && !!itemId && (!isPrivate || !!workspaceToken),
  })

  const item = useMemo(
    () => (itemQuery.data && collection ? { ...itemQuery.data, collectionRef: collection } : null),
    [itemQuery.data, collection],
  )

  const trackedItemRef = useRef<string | null>(null)
  useEffect(() => {
    if (!item || trackedItemRef.current === item.id) return
    trackedItemRef.current = item.id
    trackViewItemDownloads({
      item,
      assetCount: Object.keys(item.assets ?? {}).length,
      source: from ?? 'page',
    })
  }, [item, from, trackViewItemDownloads])

  // Go back where the link came from: the finder only resolves "my-" collections in the
  // current workspace, so it can't open links that carry another workspace.
  const back =
    from === 'purchased'
      ? { to: '/my-data/purchased', label: 'Purchased data' }
      : from === 'saved-set'
        ? { to: '/my-data/saved-sets', label: 'Saved sets' }
        : { to: collectionPath ? `/finder/${collectionPath}` : '/', label: 'Data Finder' }
  const backLink = (
    <Link asChild size="2">
      <RouterLink to={back.to}>
        <Flex align="center" gap="1">
          <ArrowLeftIcon /> {back.label}
        </Flex>
      </RouterLink>
    </Link>
  )

  const notAvailableMessage = isPrivate
    ? `This item isn't available in your current workspace${workspace ? ` (${workspace})` : ''}.`
    : 'This item could not be found.'

  let content: React.ReactNode
  if (!itemId) {
    content = <Callout type="error" message="This download link is missing an item id." />
  } else if (status === 'needs-auth') {
    content = (
      <Flex direction="column" gap="3" align="start">
        <Callout type="info" message="Sign in to view downloads for this item." />
        <Button onClick={() => void login()}>Sign in</Button>
      </Flex>
    )
  } else if (status === 'no-workspace') {
    content = <Callout type="info" message="Select a workspace to view downloads for this item." />
  } else if (
    status === 'not-found' ||
    status === 'no-access' ||
    (status === 'found' && !collectionUrl) ||
    itemQuery.isError
  ) {
    content = <Callout type="error" message={notAvailableMessage} />
  } else if (!item) {
    content = <LoadingIndicator />
  } else {
    content = (
      <ItemDownloads
        item={item}
        collection={collection}
        isPrivate={isPrivate}
        workspace={workspace}
      />
    )
  }

  return (
    <Flex direction="column" gap="5" className={styles.mainContainer}>
      {backLink}
      <PageHeading
        title={itemId ?? 'Download'}
        subtitle={collection?.displayedTitle ?? collection?.title ?? parsedPath?.collectionId}
        badge="none"
      />
      {content}
    </Flex>
  )
}
