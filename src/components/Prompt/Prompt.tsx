import { AlertDialog, Button } from '@radix-ui/themes'
import { ReactNode } from 'react'

import promptStyles from './Prompt.module.scss'

export const Prompt = ({
  cancelText = 'No',
  confirmText = 'Yes',
  onCancel = undefined,
  onConfirm,
  promptText,
  trigger,
}: {
  cancelText?: string
  confirmText?: string
  onCancel?: () => void
  onConfirm: () => void
  promptText: string
  trigger: ReactNode
}) => {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Content className={promptStyles.contentWrapper}>
        <AlertDialog.Description size="2">{promptText}</AlertDialog.Description>
        <div className={promptStyles.buttonWrapper}>
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" onClick={onCancel}>
              {cancelText}
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solid" onClick={onConfirm}>
              {confirmText}
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}
