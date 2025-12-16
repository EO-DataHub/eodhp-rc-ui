import * as Dialog from '@radix-ui/react-dialog'
import { useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import styles from './WorkspaceSelectionModal.module.scss'
import CloseIcon from '@material-design-icons/svg/filled/close.svg?react'

interface WorkspaceSelectionModalProps {
  isOpen: boolean
}

export const WorkspaceSelectionModal = ({ isOpen }: WorkspaceSelectionModalProps) => {
  const { selectedWorkspace, setSelectedWorkspace, availableWorkspaces, setShowWorkspaceModal } =
    useContext(AuthenticationContext)

  const handleWorkspaceSelect = (workspace: string) => {
    setSelectedWorkspace(workspace)
    setShowWorkspaceModal(false)
  }

  if (!isOpen || availableWorkspaces.length === 0) {
    return null
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={() => setShowWorkspaceModal(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>Select a Workspace</Dialog.Title>
            <Dialog.Close asChild>
              <button className={styles.closeButton}>
                <CloseIcon />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className={styles.description}>
            Please select a workspace to continue
          </Dialog.Description>
          <div className={styles.workspaceList}>
            {availableWorkspaces.map((workspace) => (
              <button
                key={workspace}
                className={`${styles.workspaceButton} ${
                  selectedWorkspace === workspace ? styles.selected : ''
                }`}
                onClick={() => handleWorkspaceSelect(workspace)}
              >
                {workspace}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
