export const getObjectKeyNameFromCaseInsensitiveKeyName = ({
  searchObject,
  key,
}: {
  searchObject: { [key: string]: unknown }
  key: string
}) => {
  // this will find the first search key that matches the supplied key in a case-insensitive way
  const lowercaseKey = key.toLowerCase()
  const actualKey = Object.keys(searchObject).find(
    (searchKey) => searchKey.toLowerCase() === lowercaseKey,
  )

  return actualKey
}
