export const convertDateToUTCString = (date: Date) => {
  const formattedDate =
    `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}, ` +
    `${date.getUTCHours() % 12 || 12}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} ` +
    `${date.getUTCHours() < 12 ? 'AM' : 'PM'}`

  return formattedDate
}

export const getFormattedDateRange = (interval: (string | null)[]): string => {
  if (!Array.isArray(interval) || interval.length !== 2) return 'Invalid Date Range'

  const [startDateStr, endDateStr] = interval

  const startDate = new Date(startDateStr ?? '')
  if (isNaN(startDate.getTime())) return 'Invalid Date Range'

  const endDate = endDateStr ? new Date(endDateStr) : new Date()
  if (isNaN(endDate.getTime())) return 'Invalid Date Range'

  return `${startDate.toLocaleDateString('en-GB')} - ${endDateStr ? endDate.toLocaleDateString('en-GB') : 'present'}`
}

// this is consistent with the date format used in STAC metadata
export const formatDateToMMDDYEAR = (value: string | number | Date): string => {
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-US')
}
