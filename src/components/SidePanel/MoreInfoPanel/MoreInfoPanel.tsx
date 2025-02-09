import React from 'react'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Select, Text, TextField, RadioGroup, Button, IconButton } from '@radix-ui/themes'
import styles from './MoreInfoPanel.module.scss'

interface MoreInfoPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const MoreInfoPanel: React.FC<MoreInfoPanelProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen) {
    return null
  }

  return (
    <Flex
      direction="column"
      justify="between"
      p="4"
      className={`${styles.moreInfoPanel} ${isOpen ? styles['moreInfoPanel--open'] : ''}`}
    >
      Hello
    </Flex>
  )
}
