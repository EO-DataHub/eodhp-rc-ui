import { Outlet } from 'react-router-dom'

import appLayoutStyles from './AppLayout.module.scss'
import { ActionsBar } from '../ActionsBar/ActionsBar'
import { ToastContainer } from 'react-toastify'

export const AppLayout = () => {
  return (
    <div className={appLayoutStyles.layoutWrapper}>
      <ToastContainer
        autoClose={false}
        theme="colored"
        position="bottom-right"
      />
      <ActionsBar />
      <Outlet />
    </div>
  )
}
