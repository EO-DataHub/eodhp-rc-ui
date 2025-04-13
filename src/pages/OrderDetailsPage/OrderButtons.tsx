import { Button, Flex, Tooltip } from '@radix-ui/themes'
import styles from './OrderDetailsPage.module.scss'
import { useNavigate } from 'react-router-dom'

interface OrderButtonsProps {
  onPlaceOrder: () => void
  isPlacingOrder: boolean
  isDisabled: boolean
}

export const OrderButtons = ({ onPlaceOrder, isPlacingOrder, isDisabled }: OrderButtonsProps) => {
  const navigate = useNavigate()

  return (
    <Flex className={styles.buttonsContainer} direction="row" gap="3">
      <Button className={styles.cancelButton} onClick={() => navigate(-1)}>
        Cancel
      </Button>

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
