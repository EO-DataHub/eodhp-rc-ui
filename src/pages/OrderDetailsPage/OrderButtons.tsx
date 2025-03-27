import { Button, Flex, Tooltip } from '@radix-ui/themes'
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

      {isDisabled ? (
        <Tooltip content="Complete all required fields to place order">
          <span tabIndex={0}>
            <Button className={styles.purchaseButton} onClick={onPlaceOrder} disabled aria-disabled>
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </Button>
          </span>
        </Tooltip>
      ) : (
        <Button className={styles.purchaseButton} onClick={onPlaceOrder}>
          {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
        </Button>
      )}
    </Flex>
  )
}
