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

export const getMetadataItemProperty = (
  field: string | string[],
  metadataItems: MetadataItem[],
) => {
  const fieldNames = []
  if (typeof field === 'string') {
    fieldNames.push(field)
  } else {
    fieldNames.push(...field)
  }

  for (const fieldName of fieldNames) {
    const parts = fieldName.split(':')
    let extension = ''
    if (parts.length === 2) {
      extension = parts[0]
    }
    const metadataItem = metadataItems.find((item) => item.extension === extension)

    const fieldProperty = metadataItem?.properties[fieldName]

    if (fieldProperty) {
      return { rawFieldName: fieldName, fieldProperty }
    }
  }

  return null
}
