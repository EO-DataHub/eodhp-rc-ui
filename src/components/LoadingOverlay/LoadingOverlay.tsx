import { LoadingIndicator } from '../LoadingIndicator/LoadingIndicator'
import loadingOverlayStyles from './LoadingOverlay.module.css'

export const LoadingOverlay = ({
  isVisible = false,
}: {
  isVisible: boolean
}) => {
  return isVisible ? (
    <div className={loadingOverlayStyles.overlay}>
      <LoadingIndicator light />
    </div>
  ) : null
}
