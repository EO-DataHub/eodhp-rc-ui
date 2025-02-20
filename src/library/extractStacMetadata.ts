import { MetadataItem, Item, Collection } from '../types'
import StacFields from '@radiantearth/stac-fields'

export const extractStacMetadata = (
  stacElement: Item | Collection,
  ignoredFields: string[],
): MetadataItem[] => {
  if (!stacElement) return []

  const metadataFieldsFilterFunc = (key: string) => !ignoredFields.includes(key)

  if (stacElement.type === 'Collection') {
    return StacFields.formatCollection(stacElement, metadataFieldsFilterFunc) as MetadataItem[]
  }

  return StacFields.formatItemProperties(stacElement, metadataFieldsFilterFunc) as MetadataItem[]
}
