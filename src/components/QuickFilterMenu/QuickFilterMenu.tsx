import React from "react";
import { Flex, Select, Box } from "@radix-ui/themes";
import styles from "./QuickFilterMenu.module.scss";

export const QuickFilterMenu: React.FC = () => {
  return (
    <Flex
      p="5"
      gap="2"
      align="center"
      justify="between"
      className={styles.container}
    >
      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger
            style={{ width: "100%" }}
            placeholder="Data Category"
          />
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

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: "100%" }} placeholder="Resolution" />
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

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: "100%" }} placeholder="Provider" />
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

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: "100%" }} placeholder="Location" />
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

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: "100%" }} placeholder="Keywords" />
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

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: "100%" }} placeholder="Time Period" />
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

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: "100%" }} placeholder="License" />
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
    </Flex>
  );
};
