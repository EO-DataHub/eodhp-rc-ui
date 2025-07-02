import React from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'

interface EllipsisMenuPanelProps {
  item: Item | null
  onClose: () => void
}

export const EllipsisMenuPanel: React.FC<EllipsisMenuPanelProps> = ({ item, onClose }) => {
  return (
    <>
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
            {item.assets?.cog?.href && (
              <>
                <a
                  href={item.assets.cog.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginTop: '1rem', color: '#0070f3', textDecoration: 'underline' }}
                >
                  Open COG Asset
                </a>
                {(() => {
                  const [minLon, minLat] = item.bbox
                  const small_bbox = [minLon, minLat, minLon + 0.008, minLat + 0.008]
                  const baseNotebookUrl = `http://localhost:8000/run-notebook?cog_url=${encodeURIComponent(item.assets.cog.href)}&bbox=${small_bbox.join(',')}`
                  const ndviNotebookUrl = `${baseNotebookUrl}&notebook=ndvi_calculation.ipynb`
                  const cogPreviewNotebookUrl = `${baseNotebookUrl}&notebook=cog_preview.ipynb`
                  return (
                    <>
                      <a
                        href={ndviNotebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginTop: '1rem', color: '#0070f3', textDecoration: 'underline' }}
                      >
                        Open NDVI calculation notebook
                      </a>
                      <a
                        href={cogPreviewNotebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginTop: '1rem',
                          color: '#0070f3',
                          textDecoration: 'underline',
                          display: 'block',
                        }}
                      >
                        Open COG preview notebook
                      </a>
                    </>
                  )
                })()}
              </>
            )}
            {/* Display bbox if available */}
          </Flex>
        </>
      )}
    </>
  )
}
