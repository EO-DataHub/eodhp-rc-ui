export const getFormattedDateRange = (interval: (string | null)[]): string => {
  if (!Array.isArray(interval) || interval.length !== 2) return 'Invalid Date Range'

  const [startDateStr, endDateStr] = interval

  const startDate = new Date(startDateStr ?? '')
  if (isNaN(startDate.getTime())) return 'Invalid Date Range'

  const endDate = endDateStr ? new Date(endDateStr) : new Date()
  if (isNaN(endDate.getTime())) return 'Invalid Date Range'

  return `${startDate.toLocaleDateString('en-GB')} - ${endDateStr ? endDate.toLocaleDateString('en-GB') : 'present'}`
}
