import * as Checkbox from '@radix-ui/react-checkbox'
import { CheckIcon, DividerHorizontalIcon } from '@radix-ui/react-icons'
import checkboxStyles from './IndeterminateCheckbox.module.scss'

export const IndeterminateCheckbox = (props: Checkbox.CheckboxProps) => {
  return (
    <Checkbox.Root {...props} className={checkboxStyles.root}>
      <Checkbox.Indicator className={checkboxStyles.indicator}>
        {props.checked === 'indeterminate' && <DividerHorizontalIcon />}
        {props.checked === true && <CheckIcon />}
      </Checkbox.Indicator>
    </Checkbox.Root>
  )
}
