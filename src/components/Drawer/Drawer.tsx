import { ReactNode } from 'react'
import drawerStyles from './Drawer.module.scss'

export const Drawer = ({
  children,
  isDrawerOpen,
}: {
  children: ReactNode
  isDrawerOpen: boolean
}) => {
  return (
    <div className={drawerStyles.drawerWrapper}>
      <div
        className={`${drawerStyles.drawer} ${isDrawerOpen ? drawerStyles.openDrawer : drawerStyles.closedDrawer}`}
      >
        {children}
      </div>
      <div
        className={`${drawerStyles.overlay} ${
          isDrawerOpen ? drawerStyles.overlayOpen : null
        }`}
      ></div>
    </div>
  )
}
