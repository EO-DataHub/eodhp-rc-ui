import { Text } from '@radix-ui/themes'
import { IntervalColorBar } from '../IntervalColorBar/IntervalColorBar'
import legendStyles from './IntervalLegend.module.scss'
import { LegendParameters } from '../../library/api/fakeApiData'

export const IntervalLegend = ({
  intervalColorOpacity,
  legendParameters,
  title,
}: {
  intervalColorOpacity?: number
  legendParameters: LegendParameters
  title?: string
}) => {
  return (
    <div className={legendStyles.legendWrapper}>
      <Text size="1">{title}</Text>
      <IntervalColorBar
        legendParameters={legendParameters}
        intervalColorOpacity={intervalColorOpacity}
      />
    </div>
  )
}
