import { Outlet } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { NavBar } from '../NavBar/NavBar'
import { ToastContainer } from 'react-toastify'
import { WorkspaceSelectionModal } from '../WorkspaceSelectionModal/WorkspaceSelectionModal'
import { useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'

export const AppLayout = () => {
  const { showWorkspaceModal } = useContext(AuthenticationContext)

  return (
    <Flex direction="column" height="100vh">
      <ToastContainer autoClose={false} theme="colored" position="bottom-right" />
      <NavBar />
      <Outlet />
      <WorkspaceSelectionModal isOpen={showWorkspaceModal} />
    </Flex>
  )
}
