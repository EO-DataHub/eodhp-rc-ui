import React from "react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Flex, Text, Card, Inset, IconButton } from "@radix-ui/themes";
import styles from "./CollectionCard.module.scss";
import PoundSterlingSymbolIcon from "../../../public/pound-sterling-symbol.svg?react";

export const CollectionCard: React.FC = () => {
  return (
    <Card size="2" className={styles.card}>
      <Inset clip="padding-box" side="top" pb="current">
        <img
          src="../../../public/default-thumbnail.jpg"
          style={{
            display: "block",
            objectFit: "cover",
            width: "100%",
            height: 140,
            backgroundColor: "var(--gray-5)",
          }}
        />
      </Inset>
      <Flex justify="end" mt="-6" gap="2">
        <IconButton radius="full" variant="solid" className={styles.button}>
          <PoundSterlingSymbolIcon width="18" height="18" />
        </IconButton>
        <IconButton radius="full" variant="solid" className={styles.button}>
          <InfoCircledIcon width="25" height="25" />
        </IconButton>
      </Flex>
      <Text as="p" size="3" className={styles.text}>
        Airbus PNEO Data (0.3m)
      </Text>
      <Text as="p" size="3" className={styles.text}>
        13/8/2021 – 10/12/2024
      </Text>
    </Card>
  );
};
