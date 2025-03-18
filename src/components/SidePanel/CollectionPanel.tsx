import { Flex, Heading } from '@radix-ui/themes'
import styles from './SidePanel.module.scss'

export const CollectionPanel = () => {
  return (
    <Flex
      className={styles.sidePanel}
      direction="column"
      width="420px"
      p="4"
      gap="2"
      style={
        {
          // boxShadow: sidePanelsOpen ? 'none' : undefined,
        }
      }
    >
      <Flex>
        <Heading>Data Collections</Heading>
      </Flex>
    </Flex>
  )
}
