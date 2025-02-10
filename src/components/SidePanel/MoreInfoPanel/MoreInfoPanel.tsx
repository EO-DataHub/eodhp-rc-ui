import React from 'react'
import { ReloadIcon, Cross1Icon } from '@radix-ui/react-icons'
import { Flex, Select, Text, TextField, RadioGroup, Button, IconButton } from '@radix-ui/themes'
import styles from './MoreInfoPanel.module.scss'
import type { Item } from '@/types'

interface MoreInfoPanelProps {
  item: Item | null
  onClose: () => void
}

export const MoreInfoPanel: React.FC<MoreInfoPanelProps> = ({ item, onClose }) => {
  console.log(item)
  const isOpen = item !== null

  return (
    <Flex
      direction="column"
      justify="between"
      p="4"
      position="absolute"
      className={`${styles.moreInfoPanel} ${isOpen ? styles['moreInfoPanel--open'] : ''}`}
    >
      <button onClick={onClose}>close</button>
      {/* Hello */}
    </Flex>
  )
}
