import React from "react";

import { Flex, Box, Text, Grid, Select } from "@radix-ui/themes";
import { Footer } from "@/components/Footer/Footer";
import { useQuery } from "@tanstack/react-query";
import { fetchCollections } from "@/services/collectionService";
import { QuickFilterMenu } from "@/components/QuickFilterMenu/QuickFilterMenu";
import { ActionsBar } from "@/components/ActionsBar/ActionsBar";
import { CollectionCard } from "@/components/CollectionCard/CollectionCard";
import { Collection } from "@/types";


export const DataDiscoveryPage: React.FC = () => {
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["Collections"],
    queryFn: fetchCollections,
    refetchOnWindowFocus: false,
    enabled: true,
  });

  if (isLoading) {
    return (
      <Flex justify="center" align="center">
        <Text>Loading Collections...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justify="center" align="center">
        <Text color="red">Error loading Collections!</Text>
      </Flex>
    );
  }
  
  const collections: Collection[] = data ?? [];

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
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
            />
          ))}
        </Grid>
      </Box>
      <Footer />
    </Flex>
  );
};
