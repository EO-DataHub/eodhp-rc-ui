import React, { useEffect, useState } from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import styles from './InfoPanel.module.scss'
import type { Item } from '@/types'
import { getCogAssetHref } from '@/library/assetUtils'

interface EllipsisMenuPanelProps {
  item: Item | null
  onClose: () => void
}

interface NotebookConfig {
  id: string
  file: string
  label: string
  description?: string
}

export const EllipsisMenuPanel: React.FC<EllipsisMenuPanelProps> = ({ item, onClose }) => {
  const [notebooks, setNotebooks] = useState<NotebookConfig[]>([])

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/geodowd/notebook_config/refs/heads/main/config.json')
      .then((res) => res.json())
      .then((data) => setNotebooks(data.notebooks ?? []))
      .catch(() => setNotebooks([]))
  }, [])

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
            {(() => {
              const cogAssetHref = getCogAssetHref(item)
              if (cogAssetHref) {
                const [minLon, minLat] = item.bbox
                const small_bbox = [minLon, minLat, minLon + 0.008, minLat + 0.008]
                const cogUrl = encodeURIComponent(cogAssetHref)
                const bboxStr = small_bbox.join(',')
                return (
                  <>
                    <a
                      href={cogAssetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginTop: '1rem', color: '#0070f3', textDecoration: 'underline' }}
                    >
                      Open COG Asset
                    </a>
                    {notebooks.map((nb) => (
                      <a
                        key={nb.id}
                        href={`http://localhost:8000/run/notebook/${nb.id}?cog_url=${cogUrl}&bbox=${bboxStr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginTop: '1rem',
                          color: '#0070f3',
                          textDecoration: 'underline',
                          display: 'block',
                        }}
                        title={nb.description ?? nb.label}
                      >
                        {nb.label}
                      </a>
                    ))}
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
