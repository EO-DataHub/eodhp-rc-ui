import { ReactNode } from 'react'
import pageStyles from './PageLayout.module.scss'

export const PageLayout = ({ children }: { children: ReactNode }) => {
  return <main className={pageStyles.pageWrapper}>{children}</main>
}
