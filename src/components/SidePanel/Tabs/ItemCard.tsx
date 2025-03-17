import { InfoCircledIcon, DrawingPinIcon, Cross2Icon } from '@radix-ui/react-icons'
import { Flex, Text, Card, IconButton, Tooltip, Button } from '@radix-ui/themes'
import styles from './ItemCard.module.scss'
import { convertDateToUTCString } from '@/library/dateUtils'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { Item, ItemCardType } from '@/types'
import { useSelector } from '@xstate/store/react'
import DefaultItemThumbnail from '@/assets/icons/default-thumbnail-square.jpg'
import { useContext } from 'react'
import { getCatalog } from '@/library/catalogUtils'
import { useNavigate } from 'react-router-dom'
import { AuthenticationContext } from '@/context/AuthenticationContext'

interface ItemCardProps {
  item: Item
  type: ItemCardType
}

const ItemCard = ({ item, type }: ItemCardProps) => {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useContext(AuthenticationContext)

  const collection = useSelector(dataFinderStore, (state) => state.context.collection)
  const infoPanelItem = useSelector(dataFinderStore, (state) => state.context.infoPanelItem)

  const isSelected = infoPanelItem?.id === item.id

  const isLicenseProprietary = useSelector(
    dataFinderStore,
    (state) => state.context.collection?.license === 'proprietary',
  )
  const collectionRender = useSelector(dataFinderStore, (state) => state.context.collectionRender)

  const isPinnedCard = type === 'pinned-item'
  const isQueryCard = type === 'query-item'

  const isAlreadyPinned = useSelector(dataFinderStore, (state) =>
    state.context.pinnedItems.some(
      (pinnedItem) => pinnedItem.id === item.id && pinnedItem.render === collectionRender,
    ),
  )

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null
    e.currentTarget.src = DefaultItemThumbnail
  }

  const handlePurchase = async () => {
    // in the future we will also check if the user has purchase credits available
    const aoi = dataFinderStore.getSnapshot().context.aoi

    if (aoi) {
      dataFinderStore.send({ type: 'storeAoi', aoi })
    }

    if (!collection) return

    if (getCatalog(collection) === 'planet' && !aoi) {
      alert('Please select coordinates before purchasing.')
      return
    }

    if (isAuthenticated) {
      navigate(`/order-details/${item.id}`)
    } else {
      await login()
    }
  }

  return (
    <Card
      key={`${type}-${item.id}`}
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
    >
      {isQueryCard && (
        <Flex
          align="center"
          justify="center"
          flexShrink="0"
          p="4"
          className={styles.thumbnailContainer}
          onClick={(e) => {
            e.stopPropagation()
            if (!collectionRender) return
            dataFinderStore.send({ type: 'addPinnedItem', item, collectionRender })
          }}
        >
          <img
            src={item.assets?.thumbnail?.href || DefaultItemThumbnail}
            className={styles.thumbnail}
            onError={handleImageError}
          />
          <div className={styles.overlay}>
            <Tooltip content={isAlreadyPinned ? 'Already Pinned' : 'Pin Item'}>
              <DrawingPinIcon color={isAlreadyPinned ? 'gray' : 'white'} width={20} height={20} />
            </Tooltip>
          </div>
        </Flex>
      )}
      <Flex direction="column" p="2" flexGrow={'1'}>
        <Flex>
          <Flex direction="column" flexGrow={'1'}>
            <Flex justify="between">
              <Text weight="bold" size="2" className={styles.text} style={{ maxWidth: 220 }}>
                {item.id}
              </Text>
            </Flex>
            <Text size="1" className={styles.text}>
              {convertDateToUTCString(new Date(item.properties.datetime))}
            </Text>
          </Flex>
          {isPinnedCard && (
            <Flex align="end" direction="column">
              <IconButton
                size="1"
                variant="soft"
                radius="full"
                className={styles.unpinButton}
                onClick={() => dataFinderStore.send({ type: 'removePinnedItem', item })}
              >
                <Cross2Icon />
              </IconButton>
            </Flex>
          )}
        </Flex>
        <Flex justify={isPinnedCard ? 'between' : 'end'} gap="2" align="center">
          {isPinnedCard && item.render && (
            <Flex>
              <Text size="1" className={styles.text}>
                {item.render.id}
              </Text>
            </Flex>
          )}
          <Flex justify="end" gap="2" align="center">
            <Tooltip content="More Info">
              <IconButton
                radius="full"
                variant="ghost"
                className={styles.button}
                onClick={() => dataFinderStore.send({ type: 'openItemInfoPanel', item })}
              >
                <div>
                  <InfoCircledIcon />
                </div>
              </IconButton>
            </Tooltip>
            {isLicenseProprietary && (
              <Button variant="ghost" className={styles.button} onClick={() => handlePurchase()}>
                Purchase
              </Button>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}

export default ItemCard
