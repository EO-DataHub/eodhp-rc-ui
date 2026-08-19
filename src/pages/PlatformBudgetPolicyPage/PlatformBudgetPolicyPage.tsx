import React, { useEffect, useState } from 'react'
import { Badge, Button, Flex, Table, Text, TextField } from '@radix-ui/themes'
import { toast } from 'react-toastify'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { Callout } from '@/components/Callout/Callout'
import { useMockDefaultBudgetPolicy } from './useMockDefaultBudgetPolicy'
import styles from './PlatformBudgetPolicyPage.module.scss'

// Illustrative only — BR-WSP-07: breaching a workspace's negative-balance limit should
// notify "the EODH Manager/Admin and the WS Admin", which needs a cross-workspace view of
// who's breached. Not derived from BudgetPage's per-workspace mock state (that state is
// local to whichever single workspace is currently selected there, so there's nothing real
// to aggregate from yet).
type BudgetAlertStatus = 'breached' | 'near-limit'

interface BudgetAlertRecord {
  workspace: string
  balance: number
  limit: number
  status: BudgetAlertStatus
  date: string
}

const MOCK_BUDGET_ALERTS: BudgetAlertRecord[] = [
  {
    workspace: 'samples-opencosmos',
    balance: -65,
    limit: -50,
    status: 'breached',
    date: '2026-08-10',
  },
  { workspace: 'discoveryreg', balance: -42, limit: -50, status: 'near-limit', date: '2026-08-05' },
]

const DEFAULTS_PREVIEW_NOTE =
  '(UI preview only — no platform-budget-policy API exists yet, and new workspaces don’t ' +
  'actually inherit these values yet either.)'

export const PlatformBudgetPolicyPage: React.FC = () => {
  const { policy: defaultPolicy, savePolicy: saveDefaultPolicy } = useMockDefaultBudgetPolicy()
  const [defaultsDraft, setDefaultsDraft] = useState(defaultPolicy)
  const [isDefaultsDirty, setIsDefaultsDirty] = useState(false)

  useEffect(() => {
    setDefaultsDraft(defaultPolicy)
  }, [defaultPolicy])

  const handleSaveDefaults = () => {
    saveDefaultPolicy(defaultsDraft)
    setIsDefaultsDirty(false)
    toast.success('Default budget policy saved (preview only)')
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading
        title="Budget policy"
        subtitle="Cross-workspace budget alerts and platform-wide defaults"
        hideWorkspace
      />

      <Flex direction="column" gap="2">
        <Text size="4" weight="medium">
          Budget alerts
        </Text>
        {MOCK_BUDGET_ALERTS.length === 0 ? (
          <Callout type="info" message="No workspace is near or over its budget limit." />
        ) : (
          <Table.Root className={styles.alertsTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Workspace</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Balance</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Limit</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {MOCK_BUDGET_ALERTS.map((alert) => (
                <Table.Row key={alert.workspace}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {alert.workspace}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{alert.balance} credits</Table.Cell>
                  <Table.Cell>{alert.limit} credits</Table.Cell>
                  <Table.Cell>
                    <Badge color={alert.status === 'breached' ? 'red' : 'amber'} variant="soft">
                      {alert.status === 'breached' ? 'Breached' : 'Near limit'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{new Date(alert.date).toLocaleDateString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>

      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="4" weight="medium">
            Default budget policy
          </Text>
          <Text size="1" color="gray">
            New workspaces inherit these defaults until a workspace admin sets their own override on
            the Budget page.
          </Text>
        </Flex>
        <Flex gap="4" wrap="wrap" className={styles.settingsCard}>
          <label>
            <Text as="div" size="1" color="gray" mb="1">
              Negative balance allowance
            </Text>
            <TextField.Root
              type="number"
              min={0}
              value={defaultsDraft.negativeBalanceAllowance}
              onChange={(e) => {
                setDefaultsDraft((prev) => ({
                  ...prev,
                  negativeBalanceAllowance: e.target.value,
                }))
                setIsDefaultsDirty(true)
              }}
              size="2"
              style={{ width: 160 }}
            >
              <TextField.Slot side="right">credits</TextField.Slot>
            </TextField.Root>
          </label>
          <label>
            <Text as="div" size="1" color="gray" mb="1">
              Compute budget
            </Text>
            <TextField.Root
              type="number"
              min={0}
              value={defaultsDraft.computeBudget}
              onChange={(e) => {
                setDefaultsDraft((prev) => ({ ...prev, computeBudget: e.target.value }))
                setIsDefaultsDirty(true)
              }}
              size="2"
              style={{ width: 160 }}
            >
              <TextField.Slot side="right">credits</TextField.Slot>
            </TextField.Root>
          </label>
          <label>
            <Text as="div" size="1" color="gray" mb="1">
              Warn at
            </Text>
            <TextField.Root
              type="number"
              min={0}
              value={defaultsDraft.warnAtCredits}
              onChange={(e) => {
                setDefaultsDraft((prev) => ({ ...prev, warnAtCredits: e.target.value }))
                setIsDefaultsDirty(true)
              }}
              size="2"
              style={{ width: 160 }}
            >
              <TextField.Slot side="right">credits</TextField.Slot>
            </TextField.Root>
          </label>
        </Flex>
        <Flex justify="between" align="center">
          <Text size="1" color="red">
            {DEFAULTS_PREVIEW_NOTE}
          </Text>
          <Button onClick={handleSaveDefaults} disabled={!isDefaultsDirty}>
            Save defaults
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
