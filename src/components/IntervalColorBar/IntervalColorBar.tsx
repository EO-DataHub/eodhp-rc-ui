import { LegendParameters } from '../../library/api/fakeApiData'
import colorBarStyles from './IntervalColorBar.module.scss'

export const IntervalColorBar = ({
  legendParameters,
}: {
  legendParameters: LegendParameters
  intervalColorOpacity?: number
}) => {
  const { intervals, intervalRgbaColor } = legendParameters
  return (
    <div className={colorBarStyles.colorBarWrapper}>
      <div className={colorBarStyles.colorBar}>
        {intervals.map((interval, index) => (
          <div
            key={`${interval[0]}-bin`}
            className={colorBarStyles.intervalBin}
            style={{
              backgroundColor: `rgb(${intervalRgbaColor[index]})`,
            }}
          />
        ))}
      </div>

      <div className={colorBarStyles.bar}>
        {intervals.map((interval, index) => {
          const isLastInterval = index === intervals.length - 1

          return (
            <div
              className={colorBarStyles.tickLabelParent}
              key={`${interval[0]}-tick-label-parent`}
            >
              <div
                className={
                  isLastInterval
                    ? colorBarStyles.tickLineLast
                    : colorBarStyles.tickLine
                }
              />
              <div
                key={`${interval[0]}-tick-label`}
                className={colorBarStyles.tickLabelWrapper}
              >
                <div className={colorBarStyles.tickLabel}>{interval[0]}</div>
                {isLastInterval ? (
                  <div className={colorBarStyles.lastTickLabel}>
                    {interval[1]}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
