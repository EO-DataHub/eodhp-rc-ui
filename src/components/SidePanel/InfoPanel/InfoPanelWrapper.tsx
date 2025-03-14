import { Flex } from '@radix-ui/themes'
import React, { PropsWithChildren } from 'react'
import styles from './InfoPanel.module.scss'

interface InfoPanelWrapperProps {
  isOpen: boolean
}

export const InfoPanelWrapper: React.FC<PropsWithChildren<InfoPanelWrapperProps>> = ({
  children,
  isOpen,
}) => {
  return (
    <div className={`${styles.InfoPanel} ${isOpen ? styles['InfoPanel--open'] : ''}`}>
      <Flex direction="column" gap="5" p="5" pr="8">
        {children}
      </Flex>
    </div>
  )
}
