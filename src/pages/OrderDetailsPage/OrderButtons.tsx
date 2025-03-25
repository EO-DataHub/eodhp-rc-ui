import { Button, Flex } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'

interface OrderButtonsProps {
  onPlaceOrder: () => void
  isPlacingOrder: boolean
  isDisabled: boolean
}

export const OrderButtons = ({ onPlaceOrder, isPlacingOrder, isDisabled }: OrderButtonsProps) => {
  return (
    <Flex className={styles.buttonsContainer} direction="row" gap="3">
      <Button className={styles.cancelButton}>Cancel</Button>
      <Button className={styles.purchaseButton} onClick={onPlaceOrder} disabled={isDisabled}>
        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
      </Button>
    </Flex>
  )
}
