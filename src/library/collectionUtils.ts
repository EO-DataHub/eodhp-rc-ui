import { Collection } from '@/types'
import { flexibleSearch } from '@/library/stringUtils'

export const isCollectionMatchingSearch = (collection: Collection, searchText: string) => {
  const searchFields: (keyof Collection)[] = ['id', 'title', 'description', 'keywords', 'providers']

  for (const field of searchFields) {
    if (field in collection) {
      const value = collection[field]

      if (typeof value === 'string' && flexibleSearch(value, searchText) !== -1) {
        return true
      }

      if (
        Array.isArray(value) &&
        value.some((item) => {
          if (typeof item === 'string') {
            return flexibleSearch(item, searchText) !== -1
          }
          if (typeof item === 'object' && 'name' in item) {
            return flexibleSearch(item.name, searchText) !== -1
          }
          return false
        })
      ) {
        return true
      }
    }
  }

  return false // No match found
}
