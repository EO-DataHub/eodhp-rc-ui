import { MetadataItem, Item, Collection } from '../types'
import StacFields from '@radiantearth/stac-fields'

export const extractStacMetadata = (
  stacElement: Item | Collection,
  ignoredFields: string[],
): MetadataItem[] => {
  if (!stacElement) return []

  const metadataFieldsFilterFunc = (key: string) => !ignoredFields.includes(key)

  if (stacElement.type === 'Collection') {
    const collectionCopy = { ...stacElement } as Collection
    if (collectionCopy.providers === null) {
      collectionCopy.providers = []
    }
    return StacFields.formatCollection(collectionCopy, metadataFieldsFilterFunc) as MetadataItem[]
  }

  return StacFields.formatItemProperties(stacElement, metadataFieldsFilterFunc) as MetadataItem[]
}

export const getMetadataItemProperty = (rawFieldName: string, metadataItems: MetadataItem[]) => {
  const parts = rawFieldName.split(':')
  let extension = ''
  if (parts.length === 2) {
    extension = parts[0]
  }
  const metadataItem = metadataItems.find((item) => item.extension === extension)
  return metadataItem?.properties[rawFieldName]
}
