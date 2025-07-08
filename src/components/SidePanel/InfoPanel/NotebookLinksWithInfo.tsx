import React, { useState, useCallback } from 'react'
import { IconButton } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import type { NotebookConfig } from '@/hooks/useNotebookConfigs'
import MarkdownModal from './MarkdownModal'

interface NotebookLink {
  id: string
  label: string
  description?: string
  url: string
}

interface NotebookLinksWithInfoProps {
  notebookLinks: NotebookLink[]
  notebookConfigs: NotebookConfig[]
}

const NotebookLinksWithInfo: React.FC<NotebookLinksWithInfoProps> = ({
  notebookLinks,
  notebookConfigs,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMarkdown, setModalMarkdown] = useState('')

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

  return (
    <>
      {notebookLinks.map((nbLink, i) => {
        const nbConfig = notebookConfigs[i]
        return (
          <div key={nbLink.id} style={{ display: 'flex', alignItems: 'center', marginTop: '1rem' }}>
            <a
              href={nbLink.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#0070f3',
                textDecoration: 'underline',
                display: 'block',
              }}
              title={nbLink.description ?? nbLink.label}
            >
              {nbLink.label}
            </a>
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
    </>
  )
}

export default NotebookLinksWithInfo
