import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_TITILER_BASE_URL.replace('/core', '')

type RBGA = [number, number, number, number]

function rgbaToHex([r, g, b, a]: RBGA): string {
  return (
    '#' +
    [r, g, b, a]
      .map((v) => {
        const hex = v.toString(16).padStart(2, '0')
        return hex
      })
      .join('')
  )
}

const useColormap = (colormap_name?: string) =>
  useQuery({
    queryKey: ['Colormap', colormap_name],
    queryFn: () => fetch(`${API_URL}/colorMaps/${colormap_name}`).then((res) => res.json()),
    enabled: !!colormap_name,
    select: (data) => {
      const converted: Record<string, string> = {}
      for (const [key, rgba] of Object.entries(data)) {
        if (Array.isArray(rgba) && rgba.length === 4) {
          converted[key] = rgbaToHex(rgba as RBGA)
        }
      }
      return converted
    },
  })

export default useColormap
