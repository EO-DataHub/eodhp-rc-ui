import React from 'react'
import { IconButton, Tooltip } from '@radix-ui/themes'
import { CheckCircledIcon } from '@radix-ui/react-icons'

interface QAButtonProps {
  onClick: () => void
  className?: string
}

/** Round tick button on collection cards that opens the Quality Assessment tabs. */
export const QAButton: React.FC<QAButtonProps> = ({ onClick, className }) => (
  <Tooltip content="View Quality Assessment">
    <IconButton
      radius="full"
      variant="solid"
      className={className}
      aria-label="View Quality Assessment"
      onClick={onClick}
    >
      <CheckCircledIcon width="20" height="20" />
    </IconButton>
  </Tooltip>
)
