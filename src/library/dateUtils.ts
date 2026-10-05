const formatDateTimeString = (date: Date, useUTC: boolean) => {
  const day = useUTC ? date.getUTCDate() : date.getDate()
  const month = (useUTC ? date.getUTCMonth() : date.getMonth()) + 1
  const year = useUTC ? date.getUTCFullYear() : date.getFullYear()
  const hours = useUTC ? date.getUTCHours() : date.getHours()
  const minutes = useUTC ? date.getUTCMinutes() : date.getMinutes()
  const seconds = useUTC ? date.getUTCSeconds() : date.getSeconds()

  return (
    `${day}/${month}/${year}, ` +
    `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ` +
    `${hours < 12 ? 'AM' : 'PM'}`
  )
}

export const convertDateToUTCString = (date: Date) => formatDateTimeString(date, true)

export const convertDateToLocalString = (date: Date) => formatDateTimeString(date, false)

export const getFormattedDateRange = (interval: (string | null)[]): string => {
  if (!Array.isArray(interval) || interval.length !== 2) return 'Invalid Date Range'

  const [startDateStr, endDateStr] = interval

  const startDate = new Date(startDateStr ?? '')
  if (isNaN(startDate.getTime())) return 'Invalid Date Range'

  const endDate = endDateStr ? new Date(endDateStr) : new Date()
  if (isNaN(endDate.getTime())) return 'Invalid Date Range'

  return `${startDate.toLocaleDateString('en-GB')} - ${endDateStr ? endDate.toLocaleDateString('en-GB') : 'present'}`
}

export const formatDateToDDMMYEAR = (value: string | number | Date): string => {
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-GB')
}
