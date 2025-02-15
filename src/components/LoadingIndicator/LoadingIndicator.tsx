import { Flex, Spinner } from '@radix-ui/themes'
import loadingIndicatorStyles from './LoadingIndicator.module.scss'

export const LoadingIndicator = ({
  light = false,
  size = '2',
}: {
  light?: boolean
  size?: '1' | '2' | '3'
}) => {
  const colorSpecificationClassName = light ? loadingIndicatorStyles.loadingIndicatorLight : null

  return (
    <Flex justify="center" align="center">
      <Spinner className={`${colorSpecificationClassName}`} size={size} />
    </Flex>
  )
}
