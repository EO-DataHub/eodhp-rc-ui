import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Button, DropdownMenu, Flex, IconButton, SegmentedControl } from '@radix-ui/themes'
import {
  getPeriodBounds,
  getPreviousPeriod,
  isPeriodInProgress,
  Period,
  PeriodType,
} from '@/library/usagePeriods'
import { toDateParam } from './useHubUsageSearchParams'

const TYPE_LABELS: Record<PeriodType, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
}

// How many periods the period menu offers, ending at the current one.
const MENU_PERIODS = 12

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

/** The most recent periods of this type, newest first, starting with the current one. */
const recentPeriods = (type: PeriodType, now: Date): Period[] => {
  const periods = [getPeriodBounds(type, now)]
  while (periods.length < MENU_PERIODS) {
    periods.push(getPreviousPeriod(type, periods[periods.length - 1]))
  }
  return periods
}

interface PeriodControlsProps {
  periodType: PeriodType
  period: Period
  inProgress: boolean
  onPeriodTypeChange: (type: PeriodType) => void
  onStep: (direction: -1 | 1) => void
  onSelectPeriod: (start: Date) => void
}

export const PeriodControls: React.FC<PeriodControlsProps> = ({
  periodType,
  period,
  inProgress,
  onPeriodTypeChange,
  onStep,
  onSelectPeriod,
}) => {
  const now = new Date()
  const periods = recentPeriods(periodType, now)

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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="soft" color="gray" aria-live="polite">
              {`${formatPeriod(periodType, period)}${inProgress ? ' (in progress)' : ''}`}
              <DropdownMenu.TriggerIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.RadioGroup
              value={toDateParam(period.start)}
              onValueChange={(value) => {
                const chosen = periods.find((item) => toDateParam(item.start) === value)
                if (chosen) onSelectPeriod(chosen.start)
              }}
            >
              {periods.map((item) => (
                <DropdownMenu.RadioItem key={item.start.getTime()} value={toDateParam(item.start)}>
                  {`${formatPeriod(periodType, item)}${
                    isPeriodInProgress(item, now) ? ' (in progress)' : ''
                  }`}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <IconButton
          variant="soft"
          aria-label="Next period"
          disabled={inProgress}
          onClick={() => onStep(1)}
        >
          <ChevronRightIcon />
        </IconButton>
      </Flex>
    </Flex>
  )
}
