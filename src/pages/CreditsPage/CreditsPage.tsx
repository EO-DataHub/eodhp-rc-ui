import React, { useContext, useState } from 'react'
import { Badge, Box, Button, Dialog, Flex, Table, Text, TextField } from '@radix-ui/themes'
import { toast } from 'react-toastify'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { Callout } from '@/components/Callout/Callout'
import { PageHeading } from '@/components/PageHeading/PageHeading'
import { getMockWorkspaceCategory } from '@/pages/MembersPage/useMockWorkspaceCategory'
import { useMockCreditBalance } from './useMockCreditBalance'
import styles from './CreditsPage.module.scss'

// UI/UX preview only — see "Build the Accounting page set in eodhp-rc-ui" task note.
// No credits API exists yet; the balance, burn rate and price below are illustrative.
//
// Model: a single "compute" credit currency shared by CPU, GPU, and memory (they consume the
// same pool at different rates). Memory is priced separately from CPU because the real
// usage-data API already meters it as its own quantity (memory-gb-seconds, alongside
// cpu-seconds) rather than bundling it into a CPU-hour rate — see the "should memory affect
// cost" note in pending-backend-apis.md. Storage is billed separately as a purchased plan —
// see BudgetPage.
const BURN_RATES = [
  { label: 'CPU', creditsPerUnit: 1, unit: 'hour' },
  { label: 'Memory', creditsPerUnit: 0.5, unit: 'GB-hour' },
  { label: 'GPU', creditsPerUnit: 10, unit: 'hour' },
]

const LOW_BALANCE_THRESHOLD = 200
const ILLUSTRATIVE_PRICE_PER_CREDIT = 0.05

const CREDITS_PREVIEW_NOTE =
  '(UI preview only — balance, burn rate and price are illustrative, not real. Storage is ' +
  'billed separately as a purchased plan — see Budget.)'
const BUY_CREDITS_PREVIEW_NOTE = '(UI preview only — no credits API exists yet; nothing is bought.)'

export const CreditsPage: React.FC = () => {
  const { currentWorkspace } = useContext(AuthenticationContext)
  const [balance, setBalance] = useMockCreditBalance()
  const [isBuyOpen, setIsBuyOpen] = useState(false)
  const [amount, setAmount] = useState('')

  const category = currentWorkspace ? getMockWorkspaceCategory(currentWorkspace) : null

  const amountNumber = Number(amount)
  const isAmountValid = amount.trim() !== '' && !isNaN(amountNumber) && amountNumber > 0
  const estimatedPrice = isAmountValid ? amountNumber * ILLUSTRATIVE_PRICE_PER_CREDIT : null

  const isLow = balance < LOW_BALANCE_THRESHOLD

  const resetBuyDialog = () => {
    setIsBuyOpen(false)
    setAmount('')
  }

  const handleBuy = () => {
    if (!isAmountValid) return
    setBalance((prev) => prev + amountNumber)
    toast.success(`Added ${amountNumber} credits (preview only)`)
    resetBuyDialog()
  }

  return (
    <Flex direction="column" gap="7" height="100vh" className={styles.mainContainer}>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="2">
          <PageHeading
            title="Credits"
            subtitle="Shared compute credit balance for this workspace — used for CPU, memory, and GPU"
          />
          {category && (
            <Flex align="center" gap="2">
              <Text size="2" color="gray">
                Category
              </Text>
              <Badge color={category === 'commercial' ? 'blue' : 'green'} variant="soft">
                {category === 'commercial' ? 'Commercial' : 'Research'}
              </Badge>
            </Flex>
          )}
        </Flex>
        <Button size="3" onClick={() => setIsBuyOpen(true)}>
          Buy more credits
        </Button>
      </Flex>

      <Dialog.Root
        open={isBuyOpen}
        onOpenChange={(open) => (open ? setIsBuyOpen(true) : resetBuyDialog())}
      >
        <Dialog.Content style={{ maxWidth: 420 }}>
          <Dialog.Title>Buy more credits</Dialog.Title>
          <Dialog.Description size="2" mb="2">
            Top up your workspace&apos;s compute credit balance.
          </Dialog.Description>
          <Text size="1" color="red" mb="4" as="p">
            {BUY_CREDITS_PREVIEW_NOTE}
          </Text>
          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Amount (credits)
              </Text>
              <TextField.Root
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                size="3"
              />
            </label>
            {estimatedPrice !== null && (
              <Text size="2" color="gray">
                ≈ £{estimatedPrice.toFixed(2)}
              </Text>
            )}
          </Flex>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button color="gray" variant="soft">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleBuy} disabled={!isAmountValid}>
              Buy
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Flex direction="column" gap="5">
        {isLow && <Callout type="info" message="Low balance — consider buying more credits." />}

        <Flex align="center" gap="3" className={styles.balanceCard}>
          <Text size="8" weight="bold">
            {balance}
          </Text>
          <Flex direction="column">
            <Text size="2" weight="medium">
              credits
            </Text>
            {isLow && (
              <Badge color="amber" variant="soft">
                Low
              </Badge>
            )}
          </Flex>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Burn rate
          </Text>
          <Table.Root className={styles.creditsTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Credits per unit</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {BURN_RATES.map((rate) => (
                <Table.Row key={rate.label}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {rate.label}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {rate.creditsPerUnit} / {rate.unit}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>

        <Box>
          <Text size="1" color="red">
            {CREDITS_PREVIEW_NOTE}
          </Text>
        </Box>
      </Flex>
    </Flex>
  )
}
