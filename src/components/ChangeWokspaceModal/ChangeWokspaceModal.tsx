import React, { useRef, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, Button, Flex, Text, Select } from '@radix-ui/themes'
import { Cross1Icon } from '@radix-ui/react-icons'
import styles from './ChangeWokspaceModal.module.scss'
import { fetchWorkspaces } from '@/services/workspaceTokenService'
import { AuthenticationContext } from '@/context/AuthenticationContext'

interface ChangeWokspaceModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ChangeWokspaceModal: React.FC<ChangeWokspaceModalProps> = ({ isOpen, onClose }) => {
  const { updateCurrentWorkspace, token } = useContext(AuthenticationContext)
  const containerRef = useRef<HTMLDivElement>(null)

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | undefined>()

  const { data: workspacesData } = useQuery({
    queryKey: ['Workspaces'],
    queryFn: () => fetchWorkspaces(token!),
    refetchOnWindowFocus: false,
    enabled: !!token,
  })

  const handleChangeWorkspace = () => {
    if (selectedWorkspace) {
      updateCurrentWorkspace?.(selectedWorkspace)
      onClose()
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content
        className={styles.dialogContent}
        ref={containerRef}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          containerRef.current?.setAttribute('tabindex', '-1')
          containerRef.current?.focus()
        }}
      >
        <Dialog.Close>
          <Button variant="ghost" aria-label="Close" className={styles.closeButton} tabIndex={0}>
            <Cross1Icon />
          </Button>
        </Dialog.Close>
        <Flex direction="column" className={styles.flexContainer}>
          <Dialog.Title className={styles.dialogTitle}>Change Workspace</Dialog.Title>
          <Text size="2" mb="2">
            Workspaces
          </Text>
          <Dialog.Description size="2" mb="4">
            <Select.Root size="2" value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <Select.Trigger style={{ width: '100%' }} placeholder="Select a workspace" />
              <Select.Content position="popper">
                <Select.Group>
                  {workspacesData?.map((workspace) => (
                    <Select.Item key={workspace.id} value={workspace.name}>
                      {workspace.name ?? workspace.id}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Dialog.Description>
          <Flex justify="end" gap="3">
            <Button onClick={onClose} color="gray" variant="soft">
              Cancel
            </Button>
            <Button
              onClick={handleChangeWorkspace}
              className={styles.button}
              disabled={!selectedWorkspace}
            >
              Change
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
