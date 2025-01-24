import React from "react";
import { Flex, Button, Text } from "@radix-ui/themes";
import styles from "./Footer.module.scss";

export const Footer: React.FC = () => {
  return (
    <Flex p="3" align="center" justify="between" className={styles.container}>
      <Flex gap="4" ml="2">
        <Button variant="ghost" className={styles.button}>
          About
        </Button>
        <Button variant="ghost" className={styles.button}>
          News
        </Button>
        <Button variant="ghost" className={styles.button}>
          Support
        </Button>
        <Button variant="ghost" className={styles.button}>
          Contact
        </Button>
        <Button variant="ghost" className={styles.button}>
          Privacy Policy
        </Button>
      </Flex>
      <Text size="1" className={styles.text}>
        ©2024 Earth Observation Data Hub (EODH)
      </Text>
    </Flex>
  );
};
