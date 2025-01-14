import { useContext } from 'react'
import Plot from 'react-plotly.js'

import { AnalysedUserAssets } from '../../../../library/userAssets/userAssetTypes'
import { HubWorkflowNicknames } from '../../../../configuration/constants'
import { UserAssetsContext } from '../../../../context/UserAssetsContext'
import containerStyles from '../../../../library/genericStyles/containers.module.scss'

export const ResultsVisualisation = ({
  assetToDetail,
}: {
  assetToDetail: AnalysedUserAssets
}) => {
  const { currentWorkflowNickname } = useContext(UserAssetsContext)
  const cssStyles = window.getComputedStyle(document.body)
  const markerColor = cssStyles.getPropertyValue('--unclustered-marker-color')

  const assetReturnedValues = Object.values(
    (assetToDetail?.features[0].properties.returned_values as {
      [key: string]: { datetime: string; value: number | null }
    }) ?? {},
  ).filter(
    (valueInfo: { datetime: string; value: number | null }) =>
      valueInfo.value !== null,
  )

  const xValues =
    assetReturnedValues?.map((valueInfo) => valueInfo.datetime) ?? []

  const yValues =
    assetReturnedValues?.map(
      (valueInfo: { datetime: string; value: number | null }) =>
        valueInfo.value,
    ) ?? []

  return currentWorkflowNickname === HubWorkflowNicknames.OSC ? (
    <div className={containerStyles.flexRowCenterCenterFullDimensions}>
      Data Visualization Here
    </div>
  ) : (
    <Plot
      data={[
        {
          x: xValues,
          y: yValues,
          hovertemplate:
            'Temperature: %{y:.1f} °C<br>' +
            'Date: %{x|%d %b %Y %H:%M}<br>' +
            '<extra></extra>',
          type: 'scatter',
          mode: 'markers',
          marker: { color: markerColor, size: 10 },
        },
      ]}
      layout={{
        title: 'Land Surface Temperature',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Temperature (°C)' },
      }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  )
}
