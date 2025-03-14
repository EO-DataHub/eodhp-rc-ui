import { Outlet, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { NavBar } from '../NavBar/NavBar'
import { Footer } from '../Footer/Footer'
import { ToastContainer } from 'react-toastify'

export const AppLayout = () => {
  const location = useLocation()
  const isMapsPage = location.pathname.startsWith('/finder')

  return (
    <Flex direction="column" height="100vh">
      <ToastContainer autoClose={false} theme="colored" position="bottom-right" />
      <NavBar />
      <Outlet />
      {isMapsPage ? null : <Footer />}
    </Flex>
  )
}
