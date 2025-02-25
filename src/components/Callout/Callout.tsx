import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Callout as RadixCallout } from '@radix-ui/themes'

type CalloutType = 'error' | 'warning' | 'info'

type CalloutColor = 'red' | 'orange' | 'blue'

interface CalloutStyleConfig {
  color: CalloutColor
  icon: JSX.Element
}

const alertStyles: Record<CalloutType, CalloutStyleConfig> = {
  error: {
    color: 'red',
    icon: <ExclamationTriangleIcon />,
  },
  warning: {
    color: 'orange',
    icon: <ExclamationTriangleIcon />,
  },
  info: {
    color: 'blue',
    icon: <ExclamationTriangleIcon />,
  },
}

interface CalloutProps {
  message: string
  type: CalloutType
}

export const Callout = ({ message, type }: CalloutProps) => {
  return (
    <RadixCallout.Root color={alertStyles[type].color}>
      <RadixCallout.Icon>{alertStyles[type].icon}</RadixCallout.Icon>
      <RadixCallout.Text>{message}</RadixCallout.Text>
    </RadixCallout.Root>
  )
}
