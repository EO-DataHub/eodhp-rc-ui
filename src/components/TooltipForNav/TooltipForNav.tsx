import { TooltipProps } from '@radix-ui/themes'
import * as Tooltip from '@radix-ui/react-tooltip'

import tooltipStyles from './TooltipForNav.module.css'

export const TooltipForNav = (props: TooltipProps) => {
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{props.children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className={`radix-themes ${tooltipStyles.tooltipContent}`}
          sideOffset={5}
          side="right"
        >
          {props.content}
          <Tooltip.Arrow className={tooltipStyles.tooltipArrow} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
