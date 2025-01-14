import { forwardRef } from 'react'
import { IconButton, IconButtonProps } from '@radix-ui/themes'

import buttonStyles from '../../library/genericStyles/buttons.module.scss'

export const IconButtonOverride = forwardRef<
  HTMLButtonElement,
  IconButtonProps
>(function IconButtonOverride(props, ref) {
  const { className, ...restOfProps } = props
  // this is an override of the IconButton component from the radix-ui library so that we can add MUI icons and they use the appropriate color
  return (
    <IconButton
      {...restOfProps}
      className={`${buttonStyles.iconButton} ${className}`}
      ref={ref}
    />
  )
})
