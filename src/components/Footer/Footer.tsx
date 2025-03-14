import React from 'react'
import { Flex, Button, Text } from '@radix-ui/themes'
import styles from './Footer.module.scss'

export const Footer: React.FC = () => {
  return (
    <Flex p="3" align="center" justify="between" className={styles.container}>
      <Flex gap="6" ml="2">
        <Button variant="ghost" className={styles.button}>
          <a href="https://test.eodatahub.org.uk/about/">About</a>
        </Button>

        <Button variant="ghost" className={styles.button}>
          <a href="https://test.eodatahub.org.uk/news/">News</a>
        </Button>

        <Button variant="ghost" className={styles.button}>
          <a href="https://test.eodatahub.org.uk/support/">Support</a>
        </Button>

        <Button variant="ghost" className={styles.button}>
          <a href="https://test.eodatahub.org.uk/contact/">Contact</a>
        </Button>

        <Button variant="ghost" className={styles.button}>
          <a href="#">Privacy Policy</a>
        </Button>
      </Flex>
      <Text size="1" className={styles.text}>
        ©2024 Earth Observation Data Hub (EODH)
      </Text>
    </Flex>
  )
}
