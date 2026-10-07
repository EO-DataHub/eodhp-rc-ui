import React from 'react'
import { useSelector } from '@xstate/store/react'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Link, Tooltip } from '@radix-ui/themes'
import { getFormattedDateRange } from '@/library/dateUtils'
import { QAButton } from '../QAButton/QAButton'
import styles from './SmallCollectionCard.module.scss'
import PoundSterlingSymbolIcon from '@/assets/icons/pound-sterling-symbol.svg?react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'

interface SmallCollectionCardProps {
  onSelectCollectionInfo: () => void
  onSelectCollectionQA: () => void
  onChangeCollection: () => void
  isLicenseProprietary: boolean
  hasQA: boolean
  disabled?: boolean
}

export const SmallCollectionCard: React.FC<SmallCollectionCardProps> = ({
  onSelectCollectionInfo,
  onSelectCollectionQA,
  isLicenseProprietary,
  hasQA,
  onChangeCollection,
  disabled = false,
}) => {
  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const isUserCollection = useSelector(dataFinderStore, (state) => state.context.isUserCollection)
  const dateInterval = collection?.extent?.temporal?.interval[0] ?? []

  return (
    <Card className={`${disabled ? styles.disabledCard : styles.card}`}>
      <Flex direction="column">
        <Flex justify="between" align="center">
          <Text weight="medium" size="4" className={styles.text}>
            {collection
              ? `${isUserCollection ? 'My ' : ''}${collection.title}`
              : 'No Collection Selected'}
          </Text>
          <Flex justify="end" gap="2">
            {isLicenseProprietary && (
              <IconButton radius="full" variant="solid" className={styles.costButton}>
                <PoundSterlingSymbolIcon width="6" height="9" />
              </IconButton>
            )}
            {hasQA && <QAButton onClick={onSelectCollectionQA} className={styles.infoButton} />}
            <Tooltip content="View Collection Metadata">
              <IconButton radius="full" variant="solid" className={styles.infoButton}>
                <InfoCircledIcon width="20" height="20" onClick={onSelectCollectionInfo} />
              </IconButton>
            </Tooltip>
          </Flex>
        </Flex>
        <Text size="2" className={styles.text}>
          {getFormattedDateRange(dateInterval)}
        </Text>
        <Link size="2" mt="2" className={styles.link} onClick={() => onChangeCollection()}>
          Change Collection
        </Link>
      </Flex>
    </Card>
  )
}
