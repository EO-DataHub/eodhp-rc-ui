import React, { useState } from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'
import { getCogAssetHref, downloadQlrForItem } from '@/library/assetUtils'
import { useNotebookConfigs } from '@/hooks/useNotebookConfigs'
import { getNotebookLinksForItems } from '@/library/notebookUtils'
import { filterNotebooksForItems } from '@/library/notebookUtils'
import NotebookLinksWithInfo from './NotebookLinksWithInfo'

interface EllipsisMenuPanelProps {
  item: Item | null
  onClose: () => void
}

export const EllipsisMenuPanel: React.FC<EllipsisMenuPanelProps> = ({ item, onClose }) => {
  const { notebooks, error } = useNotebookConfigs()
  const [qlrError, setQlrError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Function to fetch and download QLR file
  const handleDownloadQlr = async () => {
    if (!item) return
    setQlrError(null)
    setDownloading(true)
    try {
      await downloadQlrForItem(item)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setQlrError(err.message)
      } else {
        setQlrError('An error occurred while downloading the QLR file.')
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      {error && (
        <Text color="red" style={{ marginBottom: '1rem' }}>
          {error}
        </Text>
      )}
      {qlrError && (
        <Text color="red" style={{ marginBottom: '1rem' }}>
          {qlrError}
        </Text>
      )}
      {item && (
        <>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text weight="medium" size="5" className={styles.title} title={item.id}>
                Menu for {item.id}
              </Text>
              <Flex direction="row" gap="5" justify="start">
                <IconButton variant="ghost" onClick={onClose}>
                  <Cross1Icon width="20" height="20" color="#60646C" />
                </IconButton>
              </Flex>
            </Flex>
          </Flex>

          <Flex direction="column" gap="4" pt="6">
            {/* Add COG asset link if available */}
            {(() => {
              const cogAssetHref = getCogAssetHref(item)
              if (cogAssetHref) {
                const filteredNotebooks = filterNotebooksForItems([item], notebooks)
                const notebookLinks = getNotebookLinksForItems([item], filteredNotebooks)
                return (
                  <>
                    <a
                      href={cogAssetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginTop: '1rem', color: '#0070f3', textDecoration: 'underline' }}
                    >
                      Download COG Asset
                    </a>
                    {/* QLR Download Button */}
                    {item.collection && (
                      <a
                        href="#"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault()
                          void handleDownloadQlr()
                        }}
                        style={{
                          marginTop: '0.5rem',
                          color: '#0070f3',
                          textDecoration: 'underline',
                          cursor: downloading ? 'not-allowed' : 'pointer',
                          opacity: downloading ? 0.6 : 1,
                        }}
                        aria-disabled={downloading}
                      >
                        {downloading ? 'Downloading QLR...' : 'Download Layer File for QGIS'}
                      </a>
                    )}
                    <NotebookLinksWithInfo
                      notebookLinks={notebookLinks}
                      notebookConfigs={filteredNotebooks}
                    />
                  </>
                )
              }
              return null
            })()}
            {/* Display bbox if available */}
          </Flex>
        </>
      )}
    </>
  )
}
