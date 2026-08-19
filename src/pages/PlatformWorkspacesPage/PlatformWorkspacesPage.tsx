import React, { useMemo, useState } from 'react'
import { AlertDialog, Button, Flex, Select, Switch, Table, Text } from '@radix-ui/themes'
import { toast } from 'react-toastify'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import {
  getMockWorkspaceCategory,
  setMockWorkspaceCategory,
  WorkspaceCategory,
} from '@/pages/MembersPage/useMockWorkspaceCategory'
import {
  getMockWorkspaceIntegrations,
  setMockWorkspaceIntegration,
  WorkspaceIntegrations,
} from '@/pages/MembersPage/useMockWorkspaceIntegrations'
import styles from './PlatformWorkspacesPage.module.scss'

// UI preview only — see docs/pending-backend-apis.md. No admin-scoped "every workspace on
// the platform" endpoint exists yet, so this list is hardcoded rather than fetched (the
// same gap as the Usage tab's workspace list).
const MOCK_WORKSPACES = [
  'sparkgeotest',
  'sparkgeodemo',
  'samples-opencosmos',
  'discoveryreg',
  'open-cosmos',
  'ucl-london-airbus',
]

const CATEGORY_LABELS: Record<WorkspaceCategory, string> = {
  commercial: 'Commercial',
  research: 'Research',
}

const INTEGRATION_LABELS: Record<keyof WorkspaceIntegrations, string> = {
  daskEnabled: 'Dask integration',
  gpuEnabled: 'GPU integration',
}

const CATEGORY_PREVIEW_NOTE = '(UI preview only — no workspace-category API exists yet.)'
const INTEGRATION_PREVIEW_NOTE = '(UI preview only — no workspace-integrations API exists yet.)'

export const PlatformWorkspacesPage: React.FC = () => {
  const [settingsVersion, setSettingsVersion] = useState(0)
  const [pendingCategoryChange, setPendingCategoryChange] = useState<{
    workspace: string
    category: WorkspaceCategory
  } | null>(null)
  const [pendingIntegrationChange, setPendingIntegrationChange] = useState<{
    workspace: string
    key: keyof WorkspaceIntegrations
    value: boolean
  } | null>(null)

  const workspaces = useMemo(
    () =>
      MOCK_WORKSPACES.map((workspace) => ({
        workspace,
        category: getMockWorkspaceCategory(workspace),
        integrations: getMockWorkspaceIntegrations(workspace),
      })),
    // settingsVersion isn't read here — it's a dependency purely to force this to recompute
    // after a category/integration change, since those live in localStorage, not component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsVersion],
  )

  const handleConfirmCategoryChange = () => {
    if (!pendingCategoryChange) return
    setMockWorkspaceCategory(pendingCategoryChange.workspace, pendingCategoryChange.category)
    setSettingsVersion((v) => v + 1)
    toast.success(
      `${pendingCategoryChange.workspace} set to ${
        CATEGORY_LABELS[pendingCategoryChange.category]
      } (preview only)`,
    )
    setPendingCategoryChange(null)
  }

  const handleConfirmIntegrationChange = () => {
    if (!pendingIntegrationChange) return
    setMockWorkspaceIntegration(
      pendingIntegrationChange.workspace,
      pendingIntegrationChange.key,
      pendingIntegrationChange.value,
    )
    setSettingsVersion((v) => v + 1)
    toast.success(
      `${INTEGRATION_LABELS[pendingIntegrationChange.key]} ${
        pendingIntegrationChange.value ? 'enabled' : 'disabled'
      } for ${pendingIntegrationChange.workspace} (preview only)`,
    )
    setPendingIntegrationChange(null)
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading
        title="Workspace settings"
        subtitle="Category and integrations for every workspace on the platform"
        hideWorkspace
      />

      <Flex direction="column" gap="2">
        <Table.Root className={styles.workspacesTable}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Workspace</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Dask</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>GPU</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {workspaces.map((row) => (
              <Table.Row key={row.workspace}>
                <Table.Cell>
                  <Text size="2" weight="medium">
                    {row.workspace}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Select.Root
                    value={row.category}
                    onValueChange={(value) => {
                      if (value !== row.category) {
                        setPendingCategoryChange({
                          workspace: row.workspace,
                          category: value as WorkspaceCategory,
                        })
                      }
                    }}
                    size="1"
                  >
                    <Select.Trigger variant="soft" />
                    <Select.Content position="popper">
                      <Select.Item value="commercial">Commercial</Select.Item>
                      <Select.Item value="research">Research</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
                <Table.Cell>
                  <Switch
                    checked={row.integrations.daskEnabled}
                    onCheckedChange={(checked) =>
                      setPendingIntegrationChange({
                        workspace: row.workspace,
                        key: 'daskEnabled',
                        value: checked,
                      })
                    }
                    size="1"
                  />
                </Table.Cell>
                <Table.Cell>
                  <Switch
                    checked={row.integrations.gpuEnabled}
                    onCheckedChange={(checked) =>
                      setPendingIntegrationChange({
                        workspace: row.workspace,
                        key: 'gpuEnabled',
                        value: checked,
                      })
                    }
                    size="1"
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <Text size="1" color="red">
          {CATEGORY_PREVIEW_NOTE} {INTEGRATION_PREVIEW_NOTE}
        </Text>
      </Flex>

      <AlertDialog.Root
        open={pendingCategoryChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCategoryChange(null)
        }}
      >
        <AlertDialog.Content style={{ maxWidth: 420 }}>
          <AlertDialog.Title>Change workspace category</AlertDialog.Title>
          <AlertDialog.Description size="2" mb="2">
            Set <strong>{pendingCategoryChange?.workspace}</strong>&apos;s category to{' '}
            <strong>
              {pendingCategoryChange ? CATEGORY_LABELS[pendingCategoryChange.category] : ''}
            </strong>
            ? This affects pricing for future usage; past charges are unaffected.
          </AlertDialog.Description>
          <Text size="1" color="red" as="p">
            {CATEGORY_PREVIEW_NOTE}
          </Text>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" onClick={handleConfirmCategoryChange}>
                Confirm
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={pendingIntegrationChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingIntegrationChange(null)
        }}
      >
        <AlertDialog.Content style={{ maxWidth: 420 }}>
          <AlertDialog.Title>Change workspace integration</AlertDialog.Title>
          <AlertDialog.Description size="2" mb="2">
            {pendingIntegrationChange &&
              `${pendingIntegrationChange.value ? 'Enable' : 'Disable'} ${
                INTEGRATION_LABELS[pendingIntegrationChange.key]
              } for ${pendingIntegrationChange.workspace}?`}
          </AlertDialog.Description>
          <Text size="1" color="red" as="p">
            {INTEGRATION_PREVIEW_NOTE}
          </Text>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" onClick={handleConfirmIntegrationChange}>
                Confirm
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  )
}
