import React, { useState, useCallback } from 'react'
import { IconButton } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import type { NotebookConfig } from '@/hooks/useNotebookConfigs'
import MarkdownModal from './MarkdownModal'
import NotebookCollectionDatasetModal from './NotebookCollectionDatasetModal'

interface NotebookLink {
  id: string
  label: string
  description?: string
  url: string
}

interface NotebookLinksWithInfoProps {
  notebookLinks: NotebookLink[]
  notebookConfigs: NotebookConfig[]
  openWithModal?: boolean // <-- new
}

const NotebookLinksWithInfo: React.FC<NotebookLinksWithInfoProps> = ({
  notebookLinks,
  notebookConfigs,
  openWithModal = false, // default to false
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMarkdown, setModalMarkdown] = useState('')
  // New state for the notebook/collection/dataset modal
  const [notebookModalOpen, setNotebookModalOpen] = useState(false)
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookConfig | null>(null)

  const handleInfoClick = useCallback(async (notebook: NotebookConfig) => {
    if (notebook.markdown_file) {
      try {
        const res = await fetch(notebook.markdown_file)
        const text = await res.text()
        setModalTitle(notebook.label)
        setModalMarkdown(text)
        setModalOpen(true)
      } catch (e) {
        setModalTitle('Error')
        setModalMarkdown('Failed to load notebook info.')
        setModalOpen(true)
      }
    }
  }, [])

  // New handler for notebook click
  const handleNotebookClick = (notebook: NotebookConfig) => {
    setSelectedNotebook(notebook)
    setNotebookModalOpen(true)
  }

  return (
    <>
      {notebookLinks.map((nbLink, i) => {
        const nbConfig = notebookConfigs[i]
        return (
          <div key={nbLink.id} style={{ display: 'flex', alignItems: 'center', marginTop: '1rem' }}>
            {openWithModal ? (
              <span
                style={{
                  color: '#0070f3',
                  textDecoration: 'underline',
                  display: 'block',
                  cursor: 'pointer',
                }}
                title={nbLink.description ?? nbLink.label}
                onClick={() => handleNotebookClick(nbConfig)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleNotebookClick(nbConfig)
                }}
              >
                {nbLink.label}
              </span>
            ) : (
              <a
                href={nbLink.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#0070f3',
                  textDecoration: 'underline',
                  display: 'block',
                  cursor: 'pointer',
                }}
                title={nbLink.description ?? nbLink.label}
                tabIndex={0}
              >
                {nbLink.label}
              </a>
            )}
            {nbConfig?.markdown_file && (
              <IconButton
                variant="ghost"
                onClick={() => handleInfoClick(nbConfig)}
                style={{ marginLeft: 8 }}
                title="Show notebook info"
              >
                <InfoCircledIcon width="18" height="18" />
              </IconButton>
            )}
          </div>
        )
      })}
      <MarkdownModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        markdown={modalMarkdown}
      />
      {/* New modal for notebook/collection/dataset selection */}
      <NotebookCollectionDatasetModal
        open={notebookModalOpen}
        onClose={() => setNotebookModalOpen(false)}
        notebook={selectedNotebook}
      />
    </>
  )
}

export default NotebookLinksWithInfo
