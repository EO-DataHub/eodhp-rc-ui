import React from 'react'
import { Select } from '@radix-ui/themes'
import { Item } from '@/types'
import { getAssetsByType } from '@/library/collectionRenderingConfig'

interface AssetSelectorProps {
  assets: Item['assets']
  selectedAssetKey?: string
  onSelect: (assetKey: string) => void
  disabled?: boolean
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  assets,
  selectedAssetKey,
  onSelect,
  disabled = false,
}) => {
  const imageAssets = getAssetsByType(assets, 'image/tiff')

  // If no image/tiff assets, don't render
  if (imageAssets.length === 0) {
    return null
  }

  // Default to first asset if none selected
  const currentValue = selectedAssetKey ?? imageAssets[0]?.key ?? ''

  return (
    <Select.Root value={currentValue} onValueChange={onSelect} disabled={disabled}>
      <Select.Trigger style={{ width: 'auto', minWidth: '120px' }} />
      <Select.Content>
        <Select.Group>
          {imageAssets.map(({ key }) => (
            <Select.Item key={key} value={key}>
              {key}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  )
}
