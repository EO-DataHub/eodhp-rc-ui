import React, { PropsWithChildren, useContext } from 'react'

import { Accordion } from 'radix-ui'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import styles from './AssetTable.module.scss'
import type { Collection, Item, MetadataItem, DownloadableAsset } from '@/types'
import { Button, Flex, Text } from '@radix-ui/themes'
import DownloadIcon from '@/assets/icons/download-filled.svg?react'
import StacFields from '@radiantearth/stac-fields'
import { MetadataTable } from './MetadataTable'
import { useAnalyticsActions } from '@/hooks/useGoogleAnalyticsActions'
import { useRequesterPaysBlock } from '@/hooks/useRequesterPaysBlock'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { withBillingWorkspace } from '@/library/assetDownload'
import { isRequesterPaysCollection } from '@/library/collectionRenderingConfig'
import { isEodhHost } from '@/library/downloadScripts'

const HUB_BASE_URL = (import.meta.env.VITE_HUB_BASE_URL as string | undefined)?.replace(/\/$/, '')

type AssetTableProps =
  | {
      mode: 'item'
      assets?: Item['assets']
      item: Item
      collection: Collection
      provider: string
    }
  | {
      mode: 'collection'
      assets?: Collection['assets']
      collection: Collection
    }

const AccordionTrigger: React.FC<PropsWithChildren> = ({ children, ...props }) => (
  <Accordion.Header className={styles.AccordionHeader}>
    <Accordion.Trigger className={styles.AccordionTrigger} {...props}>
      {children}
      <ChevronDownIcon className={styles.AccordionChevron} aria-hidden />
    </Accordion.Trigger>
  </Accordion.Header>
)

const AccordionContent: React.FC<PropsWithChildren> = ({ children, ...props }) => (
  <Accordion.Content className={styles.AccordionContent} {...props}>
    <div className={styles.AccordionContentText}>{children}</div>
  </Accordion.Content>
)

// AssetTable is a context-agnostic component used for rendering and downloading STAC assets
// from either an Item or a Collection depending on mode property
export const AssetTable: React.FC<AssetTableProps> = (props) => {
  const { trackDownloadCollectionImagery, trackDownloadItemImagery } = useAnalyticsActions()
  const { login, currentWorkspace } = useContext(AuthenticationContext)
  // Collection-level assets (thumbnails and the like) stay free to download
  const downloadBlock = useRequesterPaysBlock(
    props.mode === 'item' ? props.item.collection : undefined,
    props.collection.isUserCollection,
  )

  // Requester-pays downloads must name the workspace to charge (see withBillingWorkspace).
  // This covers the Download button and the href link in the metadata table.
  const isRequesterPays =
    props.mode === 'item' &&
    !props.collection.isUserCollection &&
    isRequesterPaysCollection(props.item.collection)
  const billedHref = (href: string) =>
    isRequesterPays && isEodhHost(href, HUB_BASE_URL)
      ? withBillingWorkspace(href, currentWorkspace)
      : href

  if (!props.assets) return null

  const handleDownload = (assetKey: string, asset: DownloadableAsset) => {
    if (props.mode === 'item') {
      trackDownloadItemImagery({
        assetKey,
        asset,
        item: props.item,
      })
    } else {
      trackDownloadCollectionImagery({
        assetKey,
        asset,
        collection: props.collection,
      })
    }

    const a = document.createElement('a')
    a.href = billedHref(asset.href)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const assets = props.assets
  const assetsWithMetadata = Object.keys(assets).map((key) => {
    const asset = assets[key]
    const metadata = StacFields.formatAsset({
      ...asset,
      href: billedHref(asset.href),
    }) as MetadataItem[]
    return { asset, metadata, key }
  })

  if (assetsWithMetadata.length === 0) {
    return <Text>No assets available.</Text>
  }

  return (
    <Accordion.Root className={styles.AccordionRoot} type="multiple">
      {assetsWithMetadata.map(({ asset, metadata, key }) => (
        <Accordion.Item className={styles.AccordionItem} value={key} key={key}>
          <AccordionTrigger>{key}</AccordionTrigger>
          <AccordionContent>
            <Flex direction="column" justify="start" gap="4">
              {downloadBlock === 'sign-in' ? (
                <Button
                  style={{ alignSelf: 'flex-start' }}
                  variant="outline"
                  onClick={() => void login()}
                >
                  Sign in to download
                </Button>
              ) : downloadBlock === 'select-workspace' ? (
                <Button style={{ alignSelf: 'flex-start' }} variant="outline" disabled>
                  Select a workspace to download
                </Button>
              ) : (
                <Button
                  style={{ alignSelf: 'flex-start' }}
                  variant="outline"
                  onClick={() => handleDownload(key, asset)}
                >
                  <DownloadIcon /> Download
                </Button>
              )}
              {metadata.map((metadataItem) => (
                <MetadataTable
                  metadataItem={metadataItem}
                  key={metadataItem.extension}
                  variant="surface"
                  style={{ maxWidth: 500 }}
                />
              ))}
            </Flex>
          </AccordionContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
