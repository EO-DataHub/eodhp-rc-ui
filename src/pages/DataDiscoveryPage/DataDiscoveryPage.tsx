import React from "react";

import { Flex, Box, Grid, Select } from "@radix-ui/themes";
import { Footer } from "@/components/Footer/Footer";
import { QuickFilterMenu } from "@/components/QuickFilterMenu/QuickFilterMenu";
import { ActionsBar } from "@/components/ActionsBar/ActionsBar";
import { CollectionCard } from "@/components/CollectionCard/CollectionCard";

export const DataDiscoveryPage: React.FC = () => {
  return (
    <Flex direction="column" height="100vh">
      <Box flexGrow="1">
        <QuickFilterMenu />
        <ActionsBar />
        <Box p="5" flexGrow="1">
          <Select.Root size="3">
            <Select.Trigger style={{ width: "290px" }} placeholder="Group By" />
            <Select.Content style={{ marginTop: "45px" }}>
              <Select.Group>
                <Select.Item value="airbus">Airbus</Select.Item>
                <Select.Item value="centre_for_environmental_data">
                  Centre for Environmental Data
                </Select.Item>
                <Select.Item value="european_space_agency">
                  European Space Agency (ESA)
                </Select.Item>
                <Select.Item value="met_office">Met Office</Select.Item>
                <Select.Item value="planet">Planet</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Box>
        <Grid p="5" gap="3" columns="4" rows="4" width="auto">
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />

          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
          <CollectionCard />
        </Grid>
      </Box>
      <Footer />
    </Flex>
  );
};
