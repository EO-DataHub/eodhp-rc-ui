const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export type StoreType = 'object' | 'block'

export interface WorkspaceFileItem {
  storeType: StoreType
  fileName: string
  downloadUrl?: string
  size?: number
  lastModified?: string
  etag?: string
}

export interface WorkspaceFileListResponse {
  workspace: string
  items: WorkspaceFileItem[]
}

export const listWorkspaceFiles = async (
  workspaceId: string,
  token: string,
  store?: StoreType,
): Promise<WorkspaceFileListResponse> => {
  const params = new URLSearchParams()
  if (store) {
    params.set('store', store)
  }

  const query = params.toString()
  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspaceId}/files${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (!response.ok) {
    throw new Error('Failed to fetch workspace files')
  }

  const data = await response.json()
  return data as WorkspaceFileListResponse
}

export const uploadWorkspaceFiles = (
  workspaceId: string,
  token: string,
  store: StoreType,
  files: File[],
  onProgress?: (progress: number) => void,
): Promise<WorkspaceFileListResponse> => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${HUB_BASE_URL}/api/workspaces/${workspaceId}/files/${store}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (!onProgress || !event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = xhr.response ?? JSON.parse(xhr.responseText)
        resolve(response as WorkspaceFileListResponse)
        return
      }

      reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
    }
    xhr.onerror = () => {
      reject(new Error('Upload failed: network error'))
    }
    xhr.send(formData)
  })
}
