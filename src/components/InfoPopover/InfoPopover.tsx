import { IconButton, Popover } from '@radix-ui/themes'
import { ReactNode, useState } from 'react'
import InformationIcon from '@material-design-icons/svg/outlined/info.svg?react'

import infoPopoverStyles from './InfoPopover.module.scss'

export const InfoPopover = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)

  const buttonFocusClass = isOpen ? 'focused' : ''

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <IconButton
          className={`${infoPopoverStyles.infoButton} ${buttonFocusClass} iconButton`}
        >
          <InformationIcon />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content className={infoPopoverStyles.popoverContent}>
        {children}
      </Popover.Content>
    </Popover.Root>
  )
}
