import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Button, Flex, Grid, IconButton, Select, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { groupRadiometricWindowsByYear, parseRadiometricWindows } from '@/library/collectionQuality'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export type RadiometricStatus = 'pass' | 'fail' | 'partial pass'

const statusColor: Record<RadiometricStatus, 'green' | 'red' | 'orange'> = {
  pass: 'green',
  fail: 'red',
  'partial pass': 'orange',
}

const statusLabel: Record<RadiometricStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  'partial pass': 'Partial Pass',
}

interface RadiometricPeriodPickerProps {
  windowKeys: string[]
  activeKey: string
  getStatus: (key: string) => RadiometricStatus | undefined
  formatKeyLabel: (key: string) => string
  onSelect: (key: string) => void
}

/**
 * Year stepper with a 12-month grid. Months without results are disabled, and each month
 * is tinted by its overall result so a year can be read at a glance.
 * Falls back to a plain dropdown of every key when any key is not in `YYYY-MM-DD,...` form,
 * so no window becomes unreachable.
 */
export const RadiometricPeriodPicker = ({
  windowKeys,
  activeKey,
  getStatus,
  formatKeyLabel,
  onSelect,
}: RadiometricPeriodPickerProps) => {
  const windows = useMemo(() => parseRadiometricWindows(windowKeys), [windowKeys])
  const { years, byYear } = useMemo(() => groupRadiometricWindowsByYear(windows), [windows])

  const activeWindow = windows.find((window) => window.key === activeKey)
  if (!activeWindow || windows.length < windowKeys.length) {
    return (
      <Select.Root value={activeKey || undefined} onValueChange={onSelect}>
        <Select.Trigger placeholder="Choose Time Period" />
        <Select.Content>
          {windowKeys.map((key) => (
            <Select.Item value={key} key={key}>
              {formatKeyLabel(key)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }

  const activeYear = activeWindow.year
  const yearIndex = years.indexOf(activeYear)
  const monthsInYear = byYear.get(activeYear) ?? new Map<number, string>()

  const goToYear = (year: number) => {
    const months = byYear.get(year)
    if (!months || months.size === 0) return
    // Keep the same month when the new year has it, otherwise use its latest month
    const key = months.get(activeWindow.month) ?? months.get(Math.max(...months.keys()))
    if (key) onSelect(key)
  }

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" gap="3">
        <IconButton
          variant="ghost"
          size="1"
          aria-label="Previous year"
          disabled={yearIndex <= 0}
          onClick={() => goToYear(years[yearIndex - 1])}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Text weight="medium" aria-live="polite">
          {activeYear}
        </Text>
        <IconButton
          variant="ghost"
          size="1"
          aria-label="Next year"
          disabled={yearIndex >= years.length - 1}
          onClick={() => goToYear(years[yearIndex + 1])}
        >
          <ChevronRightIcon />
        </IconButton>
      </Flex>

      <Grid columns="6" gap="2" width="fit-content">
        {MONTH_LABELS.map((label, index) => {
          const month = index + 1
          const key = monthsInYear.get(month)
          const status = key ? getStatus(key) : undefined
          const isActive = key === activeKey
          const description = key
            ? `${MONTH_NAMES[index]} ${activeYear}: ${status ? statusLabel[status] : 'No status'}`
            : `${MONTH_NAMES[index]} ${activeYear}: no results`

          return (
            <Button
              key={label}
              size="1"
              variant={isActive ? 'solid' : 'soft'}
              color={status ? statusColor[status] : 'gray'}
              disabled={!key}
              aria-pressed={isActive}
              aria-label={description}
              title={description}
              onClick={() => key && onSelect(key)}
              style={{ minWidth: 48 }}
            >
              {label}
            </Button>
          )
        })}
      </Grid>
    </Flex>
  )
}
