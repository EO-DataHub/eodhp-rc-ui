import { Outlet } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { NavBar } from '../NavBar/NavBar'
import { ToastContainer } from 'react-toastify'

export const AppLayout = () => {
  return (
    <Flex direction="column" height="100vh">
      <ToastContainer autoClose={false} theme="colored" position="bottom-right" />
      <NavBar />
      <Outlet />
    </Flex>
  )
}
