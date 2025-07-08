import React from 'react'
import { Flex, Text, IconButton } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import type { Item } from '@/types'
import { getCogAssetHref } from '@/library/assetUtils'
import { useNotebookConfigs } from '@/hooks/useNotebookConfigs'
import { getNotebookLinksForItems, filterNotebooksForItems } from '@/library/notebookUtils'
import NotebookLinksWithInfo from '../InfoPanel/NotebookLinksWithInfo'

interface PinnedItemsMenuPanelProps {
  items: Item[]
  onClose: () => void
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.2)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const panelStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 24,
  minWidth: 320,
  boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
}

const PinnedItemsMenuPanel: React.FC<PinnedItemsMenuPanelProps> = ({ items, onClose }) => {
  const { notebooks, error } = useNotebookConfigs()
  const filteredNotebooks = filterNotebooksForItems(items, notebooks)
  const batchNotebookLinks = getNotebookLinksForItems(items, filteredNotebooks)

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <Flex justify="between" align="center" mb="4">
          <Text weight="medium" size="5">
            Batch Actions for Pinned Items
          </Text>
          <IconButton variant="ghost" onClick={onClose}>
            <Cross1Icon width="20" height="20" color="#60646C" />
          </IconButton>
        </Flex>
        <Flex direction="column" gap="4">
          {/* Show error if present */}
          {error && (
            <Text color="red" style={{ marginBottom: '1rem' }}>
              {error}
            </Text>
          )}
          {/* Batch notebook links for all pinned items */}
          {batchNotebookLinks.length > 0 && (
            <div>
              <Text weight="medium">Run Notebook on All Pinned Items:</Text>
              <NotebookLinksWithInfo
                notebookLinks={batchNotebookLinks}
                notebookConfigs={filteredNotebooks}
              />
            </div>
          )}
          {/* Individual item info below */}
          {items.length === 0 ? (
            <Text>No pinned items.</Text>
          ) : (
            items.map((item) => {
              const cogHref = getCogAssetHref(item)
              return (
                <div key={item.id}>
                  <Text>ID: {item.id}</Text>
                  {cogHref ? (
                    <div>
                      <a
                        href={cogHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#0070f3',
                          textDecoration: 'underline',
                          wordBreak: 'break-all',
                        }}
                      >
                        {cogHref}
                      </a>
                    </div>
                  ) : (
                    <Text color="gray">No COG asset found.</Text>
                  )}
                </div>
              )
            })
          )}
        </Flex>
      </div>
    </div>
  )
}

export default PinnedItemsMenuPanel
