import { Checkbox, Flex, Text } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import styles from './OrderDetailsPage.module.scss'

interface PartialSceneSelectProps {
  onChange: (checked: boolean) => void
  checked?: boolean
}

export function PartialSceneSelect({ onChange, checked = false }: PartialSceneSelectProps) {
  return (
    <>
      <Flex className={styles.partialSceneText}>
        <InfoCircledIcon className={styles.infoIcon} />
        <Text>
          You&apos;re purchasing a partial scene. Select below if you&apos;d like to buy the full
          scene.
        </Text>
      </Flex>
      <Flex className={styles.sceneCheckbox}>
        <Checkbox className={styles.checkbox} checked={checked} onCheckedChange={onChange} />
        <label className={styles.labelText}>Purchase full scene</label>
      </Flex>
    </>
  )
}
