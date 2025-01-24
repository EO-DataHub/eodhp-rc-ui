import React, { useState } from "react";

import { Flex } from "@radix-ui/themes";
import { UserMenu } from "./UserMenu";

import EarthObservationDataHubLogo from "../../../public/eo-data-hub-logo.svg?react";
import styles from "./NavBar.module.scss";

export const NavBar: React.FC = () => {
  const [isUserMenuOpen, setUserIsMenuOpen] = useState(false);

  return (
    <Flex p="3" align="center" justify="between" className={styles.container}>
      <EarthObservationDataHubLogo className={styles.logo} />
      <UserMenu
        setIsUserMenuOpen={setUserIsMenuOpen}
        isUserMenuOpen={isUserMenuOpen}
      />
    </Flex>
  );
};
