import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Text, Badge } from '@radix-ui/themes'
import type { ProcessRecord } from '@/types'
import styles from './ProcessCard.module.scss'

interface ProcessCardProps {
  record: ProcessRecord
}

function truncate(str: string | null, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return `${str.slice(0, maxLen).trim()}…`
}

export const ProcessCard: React.FC<ProcessCardProps> = ({ record }) => {
  const navigate = useNavigate()
  const title = record.properties?.title ?? 'Untitled'
  const description = truncate(record.properties?.description ?? null, 120)
  const type = record.properties?.type ?? 'workflow'

  const handleClick = (): void => {
    void navigate(`/catalogue/processes/${record.id}`)
  }

  return (
    <Flex
      className={styles.card}
      direction="column"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-label={`View details for ${title}`}
    >
      <Flex direction="column" p="4" justify="center" flexGrow="1">
        <Flex gap="2" align="center" mb="2">
          <Badge size="1" variant="soft" color="blue">
            {type === 'notebook' ? 'Notebook' : 'Workflow'}
          </Badge>
        </Flex>
        <Text as="p" size="3" weight="medium" className={styles.text}>
          {title}
        </Text>
        {description ? (
          <Text as="p" size="2" mt="2" className={styles.textMuted}>
            {description}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  )
}
