import React, { useState, useMemo } from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton, Select } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'
import {
  getCogAssetHref,
  downloadQlrForItem,
  getTitilerXyzUrl,
  getAvailableRenders,
} from '@/library/assetUtils'
import { useNotebookConfigs } from '@/hooks/useNotebookConfigs'
import { getNotebookLinksForItems } from '@/library/notebookUtils'
import { filterNotebooksForItems } from '@/library/notebookUtils'
import NotebookLinksWithInfo from './NotebookLinksWithInfo'
import { toast } from 'react-toastify'

interface EllipsisMenuPanelProps {
  item: Item | null
  onClose: () => void
}

export const EllipsisMenuPanel: React.FC<EllipsisMenuPanelProps> = ({ item, onClose }) => {
  const { notebooks, error } = useNotebookConfigs()
  const [qlrError, setQlrError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  // Popover state for XYZ Tile Service URL
  const [showXyzPopover, setShowXyzPopover] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  // Render selection state
  const [selectedRenderId, setSelectedRenderId] = useState<string | undefined>(undefined)

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

  // Get available renders for the collection
  const availableRenders = useMemo(() => {
    return item ? getAvailableRenders(item.collection) : []
  }, [item])
  // Set default renderId on item change
  React.useEffect(() => {
    if (availableRenders.length > 0) {
      setSelectedRenderId(availableRenders[0].id)
    }
  }, [item?.collection, availableRenders])
  // XYZ Tile Service URL for selected render
  const titilerUrl = item && selectedRenderId ? getTitilerXyzUrl(item, selectedRenderId) : ''

  // Copy to clipboard handler
  const handleCopy = () => {
    if (titilerUrl) {
      navigator.clipboard
        .writeText(titilerUrl)
        .then(() => {
          setCopyStatus('copied')
          setTimeout(() => setCopyStatus('idle'), 1500)
        })
        .catch((err) => {
          toast.error('Failed to copy text: ', err)
        })
    }
  }

  const handleQlrDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    await handleDownloadQlr()
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
                        onClick={handleQlrDownloadClick}
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
                    {/* XYZ Tile Service Popover Link */}
                    {titilerUrl && (
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                          marginTop: '0.5rem',
                        }}
                      >
                        <a
                          href="#"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault()
                            setShowXyzPopover((v) => !v)
                            setCopyStatus('idle')
                          }}
                          style={{
                            color: '#0070f3',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            display: 'inline-block',
                          }}
                        >
                          Show XYZ Tile Service URL
                        </a>
                        {showXyzPopover && (
                          <div
                            style={{
                              position: 'absolute',
                              zIndex: 10,
                              top: '2.2em',
                              left: 0,
                              background: '#fff',
                              border: '1px solid #ccc',
                              borderRadius: 6,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              padding: '1em',
                              minWidth: 320,
                              maxWidth: 500,
                            }}
                          >
                            {/* Visualization Style dropdown inside popover */}
                            {availableRenders.length > 1 && (
                              <div style={{ marginBottom: '1rem' }}>
                                <Text
                                  size="3"
                                  weight="medium"
                                  style={{ marginBottom: 4, display: 'block' }}
                                >
                                  Visualization Style
                                </Text>
                                <Select.Root
                                  value={selectedRenderId}
                                  onValueChange={setSelectedRenderId}
                                >
                                  <Select.Trigger placeholder="Select visualization style" />
                                  <Select.Content position="popper">
                                    <Select.Group>
                                      {availableRenders.map(
                                        (render: { id: string; title: string }) => (
                                          <Select.Item key={render.id} value={render.id}>
                                            {render.title}
                                          </Select.Item>
                                        ),
                                      )}
                                    </Select.Group>
                                  </Select.Content>
                                </Select.Root>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                              <input
                                type="text"
                                value={titilerUrl}
                                readOnly
                                style={{
                                  flex: 1,
                                  fontSize: 13,
                                  padding: 4,
                                  border: '1px solid #ddd',
                                  borderRadius: 4,
                                  marginRight: 8,
                                }}
                                onFocus={(e) => e.target.select()}
                              />
                              <button
                                onClick={handleCopy}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 13,
                                  borderRadius: 4,
                                  border: '1px solid #0070f3',
                                  background: '#f5faff',
                                  color: '#0070f3',
                                  cursor: 'pointer',
                                }}
                              >
                                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => setShowXyzPopover(false)}
                                style={{
                                  fontSize: 12,
                                  color: '#60646C',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <NotebookLinksWithInfo
                      notebookLinks={notebookLinks}
                      notebookConfigs={filteredNotebooks}
                      openWithModal={false}
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
