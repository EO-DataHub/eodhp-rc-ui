import { createPortal } from 'react-dom'
import { Text } from '@radix-ui/themes'
import styles from './AreaTooltip.module.scss'

interface AreaTooltipProps {
  area: number | null
  position: { x: number; y: number } | null
  visible: boolean
}

/**
 * Formats area value with appropriate precision:
 * - 2 decimal places for areas < 1 km²
 * - 0 decimal places for areas ≥ 1 km²
 */
function formatArea(area: number): string {
  if (area < 1) {
    return `${area.toFixed(2)} km²`
  }
  return `${Math.round(area)} km²`
}

export const AreaTooltip = ({ area, position, visible }: AreaTooltipProps) => {
  if (!visible || !position || area === null) {
    return null
  }

  return createPortal(
    <div
      className={styles.tooltip}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <Text size="1" weight="regular">
        {formatArea(area)}
      </Text>
    </div>,
    document.body,
  )
}
