import React, { PropsWithChildren } from 'react'

import { Accordion } from 'radix-ui'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import styles from './AssetItemTable.module.scss'
import type { Collection, Item, MetadataItem } from '@/types'
import { Button, Flex, Text } from '@radix-ui/themes'
import DownloadIcon from '@/../public/download-filled.svg?react'
import StacFields from '@radiantearth/stac-fields'
import { MetadataTable } from './MetadataTable'

interface AssetItemTableProps {
  assets?: Item['assets'] | Collection['assets']
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

export const AssetItemTable: React.FC<AssetItemTableProps> = ({ assets }) => {
  if (!assets) {
    return null
  }

  const handleDownload = (href: string) => {
    const a = document.createElement('a')
    a.href = href
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const assetsWithMetadata = Object.keys(assets).map((key) => {
    const asset = assets[key]
    const metadata = StacFields.formatAsset(asset) as MetadataItem[]
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
              <Button
                style={{ alignSelf: 'flex-start' }}
                variant="outline"
                onClick={() => handleDownload(asset.href)}
              >
                <DownloadIcon /> Download
              </Button>
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
