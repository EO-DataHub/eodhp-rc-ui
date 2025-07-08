import { useEffect, useState } from 'react'

const NOTEBOOK_CONFIG_URL = import.meta.env.VITE_NOTEBOOK_CONFIG_URL

export interface NotebookConfig {
  id: string
  file: string
  label: string
  description?: string
  collections?: string[]
  minItems?: number
  maxItems?: number
  markdown_file?: string
  /**
   * Describes the expected input parameters for the notebook.
   * Example: { cog_url: 'singleUrl', bbox: 'bbox' }
   */
  inputSpec?: {
    [param: string]: 'singleUrl' | 'urlList' | 'bbox' | 'custom'
  }
}

export function useNotebookConfigs() {
  const [notebooks, setNotebooks] = useState<NotebookConfig[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!NOTEBOOK_CONFIG_URL) {
      setError('Notebook config URL is not set')
      setNotebooks([])
      return
    }

    const controller = new AbortController()

    fetch(NOTEBOOK_CONFIG_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch notebook configs')
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data.notebooks)) {
          setNotebooks(data.notebooks)
        } else {
          setNotebooks([])
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message)
          setNotebooks([])
        }
      })

    return () => controller.abort()
  }, [])

  return { notebooks, error }
}
