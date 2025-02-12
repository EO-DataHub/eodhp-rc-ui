import React from 'react'
import { Flex, Select, Box } from '@radix-ui/themes'
import styles from './QuickFilterMenu.module.scss'

export const QuickFilterMenu: React.FC = () => {
  return (
    <Flex p="5" gap="2" align="center" justify="between" className={styles.container}>
      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="Data Category" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="cat:climate_data">Climate Data</Select.Item>
              <Select.Item value="cat:climate_projections">Climate Projections</Select.Item>
              <Select.Item value="cat:hyperspectral">Hyperspectral</Select.Item>
              <Select.Item value="cat:optical_multispectral">
                Optical &amp; Multispectral
              </Select.Item>
              <Select.Item value="cat:radar">Radar</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="Resolution" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="res:under_1m">Less than 1m</Select.Item>
              <Select.Item value="res:10m">1m &ndash; &lt;10m</Select.Item>
              <Select.Item value="res:100m">10m &ndash; &lt;100m</Select.Item>
              <Select.Item value="res:1km">100m &ndash; &lt;1km</Select.Item>
              <Select.Item value="res:10km">1km &ndash; &lt;10km</Select.Item>
              <Select.Item value="res:100km">10km &ndash; &lt;100km</Select.Item>
              <Select.Item value="res:over_100km">Greater than 100km</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="Provider" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="pro:airbus">Airbus</Select.Item>
              <Select.Item value="pro:ceda">Centre for Environmental Data</Select.Item>
              <Select.Item value="pro:defra">DEFRA</Select.Item>
              <Select.Item value="pro:esa">European Space Agency (ESA)</Select.Item>
              <Select.Item value="pro:eocis">EOCIS</Select.Item>
              <Select.Item value="pro:jncc">JNCC</Select.Item>
              <Select.Item value="pro:multiple_contributors">Multiple contributors</Select.Item>
              <Select.Item value="pro:planet">Planet</Select.Item>
              <Select.Item value="pro:met_office">UK Met Office</Select.Item>
              <Select.Item value="pro:uol_lst">University of Leicester (LST)</Select.Item>
              <Select.Item value="pro:other">Other</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="Location" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="loc:global">Global</Select.Item>
              <Select.Item value="loc:continental">Continental</Select.Item>
              <Select.Item value="loc:uk">United Kingdom</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="Keywords" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="key:agriculture">Agriculture &amp; Forestry</Select.Item>
              <Select.Item value="key:climate">Climate &amp; Environment</Select.Item>
              <Select.Item value="key:disaster">Disaster Management</Select.Item>
              <Select.Item value="key:emissions">Gas &amp; Emissions Monitoring</Select.Item>
              <Select.Item value="key:ecosystem">Habitat &amp; Ecosystem Mapping</Select.Item>
              <Select.Item value="key:infrastructure">
                Infrastructure &amp; Urban Development
              </Select.Item>
              <Select.Item value="key:management">Land &amp; Water Management</Select.Item>
              <Select.Item value="key:ocean">Marine &amp; Ocean Science</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="Time Period" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="per:historic">Historic</Select.Item>
              <Select.Item value="per:current">Current</Select.Item>
              <Select.Item value="per:forecast">Forecast</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>

      <Box flexGrow="1">
        <Select.Root size="3">
          <Select.Trigger style={{ width: '100%' }} placeholder="License" />
          <Select.Content style={{ marginTop: '45px' }}>
            <Select.Group>
              <Select.Item value="lic:commercial">Commercial Data</Select.Item>
              <Select.Item value="lic:open">Open Data</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Box>
    </Flex>
  )
}
