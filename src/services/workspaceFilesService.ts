const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export type StoreType = 'object' | 'block'

export interface WorkspaceFileItem {
  storeType: StoreType
  fileName: string
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

export const uploadObjectStoreFilePresigned = async (
  workspaceId: string,
  token: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> => {
  if (file.name.includes('/')) {
    throw new Error(`File name must not contain '/': ${file.name}`)
  }
  const SIX_GB = 6 * 1024 * 1024 * 1024
  if (file.size > SIX_GB) {
    throw new Error(`File exceeds the 6 GB upload limit: ${file.name}`)
  }
  const urlResponse = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspaceId}/files/object/upload-url?file=${encodeURIComponent(file.name)}&size=${file.size}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!urlResponse.ok) {
    throw new Error(`Failed to get upload URL: ${urlResponse.status} ${urlResponse.statusText}`)
  }
  const { url } = await urlResponse.json()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    if (file.type) xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (!onProgress || !event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Upload failed: network error'))
    xhr.send(file)
  })
}

export interface WorkspaceFileDeleteResponse {
  workspace: string
  deleted: string[]
  failed?: {
    fileName: string
    error: string
  }[]
}

export const deleteWorkspaceFile = async (
  workspaceId: string,
  token: string,
  store: StoreType,
  fileName: string,
): Promise<WorkspaceFileDeleteResponse> => {
  const params = new URLSearchParams()
  params.set('file', fileName)

  const response = await fetch(
    `${HUB_BASE_URL}/api/workspaces/${workspaceId}/files/${store}?${params.toString()}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to delete workspace file')
  }

  const data = await response.json()
  return data as WorkspaceFileDeleteResponse
}
