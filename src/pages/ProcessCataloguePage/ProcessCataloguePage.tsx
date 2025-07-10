import React from 'react'
import { Box } from '@radix-ui/themes'
import { useNotebookConfigs } from '@/hooks/useNotebookConfigs'
import NotebookLinksWithInfo from '@/components/SidePanel/InfoPanel/NotebookLinksWithInfo'
import styles from '../DataFinderPage/DataFinderPage.module.scss'

export const ProcessCataloguePage: React.FC = () => {
  const { notebooks, error } = useNotebookConfigs()

  // Build notebook links (no items context, so just link to the notebook base URLs)
  const notebookLinks = notebooks.map((nb) => ({
    id: nb.id,
    label: nb.label,
    description: nb.description,
    url: nb.file || '#',
  }))

  return (
    <Box height="var(--content-height)" position="relative">
      <Box className={styles.floatingContainer}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 8 }}>Process Catalogue</h1>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!error && (
          <>
            {notebooks.length === 0 ? (
              <div>Loading notebooks...</div>
            ) : (
              <NotebookLinksWithInfo notebookLinks={notebookLinks} notebookConfigs={notebooks} />
            )}
          </>
        )}
      </Box>
    </Box>
  )
}
