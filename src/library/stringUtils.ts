// Perform search that ignores whitespaces and case insensitive
export const flexibleSearch = (text: string, query: string) => {
  const cleanText = text.replace(/\s+/g, '')
  const cleanQuery = query.replace(/\s+/g, '')
  const regex = new RegExp(cleanQuery, 'i')
  return cleanText.search(regex)
}
