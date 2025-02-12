import React, { PropsWithChildren } from 'react'

import { Accordion } from 'radix-ui'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import styles from './AssetItemTable.module.scss'
import type { Item } from '@/types'
import { Button, Flex } from '@radix-ui/themes'
import DownloadIcon from '@/../public/download-filled.svg?react'

interface AssetItemTableProps {
  assets: Item['assets']
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
  const handleDownload = (href: string) => {
    const a = document.createElement('a')
    a.href = href
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Accordion.Root className={styles.AccordionRoot} type="multiple">
      {Object.keys(assets).map((key) => (
        <Accordion.Item className={styles.AccordionItem} value={key} key={key}>
          <AccordionTrigger>{key}</AccordionTrigger>
          <AccordionContent>
            <Flex direction="column" justify="start" gap="2" pb="4">
              <Button
                style={{ alignSelf: 'flex-start' }}
                variant="outline"
                onClick={() => handleDownload(assets[key].href)}
              >
                <DownloadIcon /> Download
              </Button>
            </Flex>
          </AccordionContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
