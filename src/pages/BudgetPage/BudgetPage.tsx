import React, { useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Progress,
  RadioCards,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes'
import { toast } from 'react-toastify'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import styles from './BudgetPage.module.scss'

// UI/UX preview only — see "Build the Accounting page set in eodhp-rc-ui" task note.
// No budget/plan API exists yet; usage figures, thresholds and plan prices below are illustrative.
//
// Model: compute (CPU+GPU) is metered against the single credit pool from CreditsPage, so it
// still gets a threshold/alert here. Storage is not credit-metered — it's a purchased plan
// (like Google Drive), so it gets a plan picker with a fixed allowance instead of a threshold.
interface StoragePlan {
  id: string
  label: string
  allowanceGb: number
  pricePerMonth: number
}

const STORAGE_PLANS: StoragePlan[] = [
  { id: 'free', label: 'Free — up to 100 GB', allowanceGb: 100, pricePerMonth: 0 },
  { id: 'standard', label: 'Standard — 100 GB to 500 GB', allowanceGb: 500, pricePerMonth: 5 },
  { id: 'plus', label: 'Plus — 500 GB to 1 TB', allowanceGb: 1000, pricePerMonth: 15 },
]

const INITIAL_COMPUTE_BUDGET = {
  usedThisMonth: 340,
  threshold: 1000,
  alertsEnabled: true,
}

const INITIAL_STORAGE_PLAN_ID = 'standard'
const INITIAL_STORAGE_USED_GB = 412

const INITIAL_NEGATIVE_BALANCE_ALLOWANCE = '50'

export const BudgetPage: React.FC = () => {
  const [computeBudget, setComputeBudget] = useState(INITIAL_COMPUTE_BUDGET)
  const [negativeBalanceAllowance, setNegativeBalanceAllowance] = useState(
    INITIAL_NEGATIVE_BALANCE_ALLOWANCE,
  )
  const [storagePlanId, setStoragePlanId] = useState(INITIAL_STORAGE_PLAN_ID)
  const [storageUsedGb] = useState(INITIAL_STORAGE_USED_GB)
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState(INITIAL_STORAGE_PLAN_ID)
  const [isDirty, setIsDirty] = useState(false)

  const currentPlan = STORAGE_PLANS.find((plan) => plan.id === storagePlanId) ?? STORAGE_PLANS[0]
  const storagePercentUsed =
    currentPlan.allowanceGb > 0 ? (storageUsedGb / currentPlan.allowanceGb) * 100 : 0
  const computePercentUsed =
    computeBudget.threshold > 0 ? (computeBudget.usedThisMonth / computeBudget.threshold) * 100 : 0

  const openChangePlan = () => {
    setPendingPlanId(storagePlanId)
    setIsChangePlanOpen(true)
  }

  const handleConfirmPlanChange = () => {
    setStoragePlanId(pendingPlanId)
    setIsChangePlanOpen(false)
    const plan = STORAGE_PLANS.find((p) => p.id === pendingPlanId)
    toast.success(`Switched to the ${plan?.label} plan (preview only)`)
  }

  const handleSave = () => {
    setIsDirty(false)
    toast.success('Budget settings saved (preview only)')
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <PageHeading
        title="Budget"
        subtitle="Compute credit alerts and your storage plan for this workspace"
      />

      <Flex direction="column" gap="6">
        <Flex direction="column" gap="3">
          <Text size="4" weight="medium">
            Compute
          </Text>

          <Flex direction="column" gap="2" className={styles.negativeBalanceSection}>
            <Text size="2" weight="medium">
              Allow negative balance up to
            </Text>
            <Text size="1" color="gray">
              How far the compute credit balance can go below zero before new activity is blocked.
            </Text>
            <Box maxWidth="200px">
              <TextField.Root
                type="number"
                min={0}
                value={negativeBalanceAllowance}
                onChange={(e) => {
                  setNegativeBalanceAllowance(e.target.value)
                  setIsDirty(true)
                }}
                size="2"
              >
                <TextField.Slot side="right">credits</TextField.Slot>
              </TextField.Root>
            </Box>
          </Flex>

          <Flex align="center" justify="between" className={styles.computeRow}>
            <Flex direction="column" gap="1" className={styles.usageCell}>
              <Text size="2">
                {computeBudget.usedThisMonth} / {computeBudget.threshold} credits used this month
              </Text>
              <Progress
                value={Math.min(100, computePercentUsed)}
                color={computePercentUsed >= 90 ? 'red' : undefined}
                size="1"
              />
            </Flex>
            <Flex align="center" gap="4">
              <label>
                <Text as="div" size="1" color="gray" mb="1">
                  Threshold
                </Text>
                <TextField.Root
                  type="number"
                  min={0}
                  value={String(computeBudget.threshold)}
                  onChange={(e) => {
                    setComputeBudget((prev) => ({ ...prev, threshold: Number(e.target.value) }))
                    setIsDirty(true)
                  }}
                  size="2"
                  style={{ width: 100 }}
                />
              </label>
              <Flex direction="column" align="center" gap="1">
                <Text size="1" color="gray">
                  Alerts
                </Text>
                <Switch
                  checked={computeBudget.alertsEnabled}
                  onCheckedChange={(checked) => {
                    setComputeBudget((prev) => ({ ...prev, alertsEnabled: checked }))
                    setIsDirty(true)
                  }}
                />
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Text size="4" weight="medium">
              Storage plan
            </Text>
            <Button variant="soft" onClick={openChangePlan}>
              Change plan
            </Button>
          </Flex>

          <Flex direction="column" gap="2" className={styles.storageCard}>
            <Flex align="center" gap="2">
              <Badge color="blue" variant="soft">
                {currentPlan.label}
              </Badge>
              <Text size="2" color="gray">
                {currentPlan.pricePerMonth > 0 ? `£${currentPlan.pricePerMonth}/month` : 'Free'}
              </Text>
            </Flex>
            <Flex direction="column" gap="1" className={styles.usageCell}>
              <Text size="2">
                {storageUsedGb} / {currentPlan.allowanceGb} GB used
              </Text>
              <Progress
                value={Math.min(100, storagePercentUsed)}
                color={storagePercentUsed >= 90 ? 'red' : undefined}
                size="1"
              />
            </Flex>
          </Flex>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="1" color="gray">
            (UI preview only — usage figures and plan prices are illustrative, nothing is saved to a
            real API.)
          </Text>
          <Button onClick={handleSave} disabled={!isDirty}>
            Save changes
          </Button>
        </Flex>
      </Flex>

      <Dialog.Root open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
        <Dialog.Content style={{ maxWidth: 480 }}>
          <Dialog.Title>Change storage plan</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Your storage allowance is fixed by your plan — usage beyond it needs an upgrade.
          </Dialog.Description>
          <RadioCards.Root value={pendingPlanId} onValueChange={setPendingPlanId} columns="1">
            {STORAGE_PLANS.map((plan) => (
              <RadioCards.Item key={plan.id} value={plan.id}>
                <Flex direction="column" gap="1">
                  <Text weight="medium">{plan.label}</Text>
                  <Text size="1" color="gray">
                    {plan.pricePerMonth > 0 ? `£${plan.pricePerMonth}/month` : 'Free'}
                  </Text>
                </Flex>
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button color="gray" variant="soft">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleConfirmPlanChange}>Confirm</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}
