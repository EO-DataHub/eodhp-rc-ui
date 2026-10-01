import { Button, Code, Dialog, Flex, Text } from '@radix-ui/themes'
import type { SavedSet } from '../demoTypes'
import { DemoBadge } from './DemoBadge'

/** How to read a saved set from Jupyter, QGIS and other STAC clients. */
export const UseElsewhereDialog = ({ set, onClose }: { set: SavedSet; onClose: () => void }) => {
  const slug = set.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="560px">
        <Flex justify="between" align="start">
          <Dialog.Title>Use &apos;{set.name}&apos; in other tools</Dialog.Title>
          <DemoBadge />
        </Flex>
        <Dialog.Description size="2" color="gray" mb="4">
          Saved sets are stored in your workspace, so your own code and the GIS plugins can read the
          same items.
        </Dialog.Description>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              In your own Python code, with pyeodh
            </Text>
            <Code size="2" variant="soft" style={{ whiteSpace: 'pre', padding: '0.75rem' }}>
              {`ws = client.get_workspace("${set.workspace}")\nitems = ws.pin_sets.get("${slug}").items()`}
            </Code>
          </Flex>
          <Text size="2" color="gray">
            In QGIS, open the EODH plugin and choose the set under Saved sets.
          </Text>
        </Flex>
        <Flex justify="end" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
