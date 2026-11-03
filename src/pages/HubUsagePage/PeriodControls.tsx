import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Flex, IconButton, SegmentedControl, Text } from '@radix-ui/themes'
import { Period, PeriodType } from '@/library/usagePeriods'
import { parseDateParam, toDateParam } from './useHubUsageSearchParams'

const TYPE_LABELS: Record<PeriodType, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
}

const utcFormat = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options })

const dayFormat = utcFormat({ day: 'numeric', month: 'short', year: 'numeric' })
const monthFormat = utcFormat({ month: 'long', year: 'numeric' })

const formatPeriod = (type: PeriodType, period: Period): string => {
  switch (type) {
    case 'day':
      return dayFormat.format(period.start)
    case 'week':
      return `Week of ${dayFormat.format(period.start)}`
    case 'month':
      return monthFormat.format(period.start)
    case 'quarter':
      return `Q${Math.floor(period.start.getUTCMonth() / 3) + 1} ${period.start.getUTCFullYear()}`
  }
}

interface PeriodControlsProps {
  periodType: PeriodType
  period: Period
  inProgress: boolean
  onPeriodTypeChange: (type: PeriodType) => void
  onStep: (direction: -1 | 1) => void
  onSelectDate: (date: Date) => void
}

export const PeriodControls: React.FC<PeriodControlsProps> = ({
  periodType,
  period,
  inProgress,
  onPeriodTypeChange,
  onStep,
  onSelectDate,
}) => {
  const today = toDateParam(new Date())

  return (
    <Flex gap="3" align="center" wrap="wrap">
      <SegmentedControl.Root
        value={periodType}
        onValueChange={(value) => onPeriodTypeChange(value as PeriodType)}
      >
        {(Object.keys(TYPE_LABELS) as PeriodType[]).map((type) => (
          <SegmentedControl.Item key={type} value={type}>
            {TYPE_LABELS[type]}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>

      <Flex gap="2" align="center">
        <IconButton variant="soft" aria-label="Previous period" onClick={() => onStep(-1)}>
          <ChevronLeftIcon />
        </IconButton>
        <Text weight="medium" aria-live="polite">
          {formatPeriod(periodType, period)}
          {inProgress && ' (in progress)'}
        </Text>
        <IconButton
          variant="soft"
          aria-label="Next period"
          disabled={inProgress}
          onClick={() => onStep(1)}
        >
          <ChevronRightIcon />
        </IconButton>
      </Flex>

      <Flex gap="2" align="center" asChild>
        <label>
          <Text size="2">Go to date</Text>
          <input
            type="date"
            value={toDateParam(period.start)}
            max={today}
            onChange={(event) => {
              const date = parseDateParam(event.target.value)
              if (date) onSelectDate(date)
            }}
          />
        </label>
      </Flex>
    </Flex>
  )
}
