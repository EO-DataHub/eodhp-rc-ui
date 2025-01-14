import { Spinner } from '@radix-ui/themes'
import loadingIndicatorStyles from './LoadingIndicator.module.css'

export const LoadingIndicator = ({ light = false }: { light?: boolean }) => {
  const colorSpecificationClassName = light
    ? loadingIndicatorStyles.loadingIndicatorLight
    : null

  return (
    <div className={loadingIndicatorStyles.wrapper}>
      <Spinner
        className={`${loadingIndicatorStyles.loadingIndicator} ${colorSpecificationClassName}`}
      />
    </div>
  )
}
