export const fetchQuicklookImage = async ({
  url,
  token,
}: {
  url: string
  token?: string
}): Promise<string> => {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Failed to fetch image')
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export const fetchThumbnailImage = async ({
  url,
  token,
}: {
  url: string
  token?: string
}): Promise<string> => {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Failed to fetch thumbnail')
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
