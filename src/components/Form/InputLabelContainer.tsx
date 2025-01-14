import { ReactNode } from 'react'
import inputLabelContainerStyles from './InputLabelContainer.module.scss'

export const InputLabelContainer = ({ children }: { children: ReactNode }) => {
  return <div className={inputLabelContainerStyles.container}>{children}</div>
}
