import React, { useContext, useState } from 'react'
import { Flex, Text, Button, TextField, Select, AlertDialog, Badge } from '@radix-ui/themes'
import { useQuery } from '@tanstack/react-query'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { useOpenCosmosAuth } from '@/hooks/useOpenCosmosAuth'
import {
  fetchLinkedAccounts,
  validateLinkedAccountKey,
  linkAccount,
  unlinkAccount,
  LinkedAccountProvider,
  LinkedAccountValidation,
} from '@/services/linkedAccountsService'
import { fetchAccounts } from '@/services/accountService'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { Callout } from '@/components/Callout/Callout'
import styles from './ProviderAccountsPage.module.scss'

const PROVIDER_LABELS: Record<LinkedAccountProvider, string> = {
  airbus: 'Airbus',
  planet: 'Planet',
}

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

interface ProviderKeyCardProps {
  provider: LinkedAccountProvider
  isLinked: boolean
  canEdit: boolean
  workspace: string
  token: string
  onChanged: () => void
}

const ProviderKeyCard: React.FC<ProviderKeyCardProps> = ({
  provider,
  isLinked,
  canEdit,
  workspace,
  token,
  onChanged,
}) => {
  const [apiKey, setApiKey] = useState('')
  const [validation, setValidation] = useState<LinkedAccountValidation | null>(null)
  const [legacyContract, setLegacyContract] = useState('')
  const [pneoContract, setPneoContract] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  const legacyOptions = Object.entries(validation?.contracts?.optical ?? {})
    .filter(([, value]) => value.includes('LEGACY'))
    .map(([key]) => key)
  const pneoOptions = Object.entries(validation?.contracts?.optical ?? {})
    .filter(([, value]) => value.includes('PNEO'))
    .map(([key]) => key)

  const handleValidate = async () => {
    setError(null)
    setRunning(true)
    try {
      const result = await validateLinkedAccountKey(workspace, token, provider, apiKey.trim())
      setValidation(result)
      if (provider === 'airbus') {
        const optical = result.contracts?.optical ?? {}
        const firstLegacy = Object.entries(optical).find(([, v]) => v.includes('LEGACY'))?.[0]
        const firstPneo = Object.entries(optical).find(([, v]) => v.includes('PNEO'))?.[0]
        setLegacyContract(firstLegacy ?? '')
        setPneoContract(firstPneo ?? '')
      }
    } catch (err) {
      setError(toErrorMessage(err, 'Error validating account, please check your API key.'))
    } finally {
      setRunning(false)
    }
  }

  const handleLink = async () => {
    if (!validation) return
    setError(null)
    setRunning(true)
    try {
      const contracts =
        provider === 'airbus'
          ? {
              sar: validation.contracts?.sar ?? false,
              optical: {
                ...(legacyContract && validation.contracts
                  ? { [legacyContract]: validation.contracts.optical[legacyContract] }
                  : {}),
                ...(pneoContract && validation.contracts
                  ? { [pneoContract]: validation.contracts.optical[pneoContract] }
                  : {}),
              },
            }
          : undefined

      await linkAccount(workspace, token, {
        name: provider,
        key: apiKey.trim(),
        contracts,
      })
      setApiKey('')
      setValidation(null)
      onChanged()
    } catch (err) {
      setError(toErrorMessage(err, 'Error linking account.'))
    } finally {
      setRunning(false)
    }
  }

  const handleUnlink = async () => {
    setError(null)
    setRunning(true)
    try {
      await unlinkAccount(workspace, token, provider)
      onChanged()
    } catch (err) {
      setError(toErrorMessage(err, 'Error unlinking account.'))
    } finally {
      setRunning(false)
      setConfirmUnlink(false)
    }
  }

  return (
    <Flex direction="column" gap="3" className={styles.providerCard}>
      <Flex align="center" gap="2">
        <Text size="4" weight="medium">
          {PROVIDER_LABELS[provider]}
        </Text>
        <Badge color={isLinked ? 'green' : 'gray'} variant="soft">
          {isLinked ? 'Linked' : 'Not linked'}
        </Badge>
      </Flex>

      {error && <Callout type="error" message={error} />}

      {isLinked ? (
        <Flex>
          <AlertDialog.Root open={confirmUnlink} onOpenChange={setConfirmUnlink}>
            <AlertDialog.Trigger>
              <Button color="red" variant="soft" disabled={!canEdit || running}>
                Unlink account
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content style={{ maxWidth: 420 }}>
              <AlertDialog.Title>Unlink {PROVIDER_LABELS[provider]} account</AlertDialog.Title>
              <AlertDialog.Description size="2">
                Orders through {PROVIDER_LABELS[provider]} will no longer be possible from this
                workspace until it&apos;s linked again.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={() => void handleUnlink()}>
                    Unlink
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      ) : (
        <Flex direction="column" gap="3">
          <TextField.Root
            placeholder="Enter your API key"
            type="password"
            value={apiKey}
            disabled={!canEdit || Boolean(validation)}
            onChange={(e) => setApiKey(e.target.value)}
          />

          {validation && provider === 'airbus' && (
            <Flex direction="column" gap="2" className={styles.contractSelectors}>
              <Text size="2" color="gray">
                Radar (SAR): {validation.contracts?.sar ? 'available' : 'not available'}
              </Text>
              {legacyOptions.length > 0 && (
                <label>
                  <Text as="div" size="2" mb="1">
                    Legacy contract
                  </Text>
                  <Select.Root value={legacyContract} onValueChange={setLegacyContract}>
                    <Select.Trigger />
                    <Select.Content>
                      {legacyOptions.map((option) => (
                        <Select.Item key={option} value={option}>
                          {option}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              )}
              {pneoOptions.length > 0 && (
                <label>
                  <Text as="div" size="2" mb="1">
                    PNEO contract
                  </Text>
                  <Select.Root value={pneoContract} onValueChange={setPneoContract}>
                    <Select.Trigger />
                    <Select.Content>
                      {pneoOptions.map((option) => (
                        <Select.Item key={option} value={option}>
                          {option}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              )}
            </Flex>
          )}
          {validation && provider === 'planet' && (
            <Text size="2" color="green">
              API key is valid.
            </Text>
          )}

          <Flex gap="3">
            {!validation ? (
              <Button
                disabled={!canEdit || !apiKey.trim() || running}
                onClick={() => void handleValidate()}
              >
                Validate API key
              </Button>
            ) : (
              <Button disabled={!canEdit || running} onClick={() => void handleLink()}>
                Link account
              </Button>
            )}
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}

const OpenCosmosCard: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const { isConnected, isLoading, hasConfiguration, user, error, connect, disconnect } =
    useOpenCosmosAuth()
  const [organizationId, setOrganizationId] = useState('')
  const hasValidOrganizationId = /^\d+$/.test(organizationId)

  const statusText = !hasConfiguration ? 'Unavailable' : isConnected ? 'Connected' : 'Not connected'
  const description = isConnected
    ? user?.email ?? user?.name ?? 'Open Cosmos is connected for this workspace.'
    : 'Sign in to make your Open Cosmos credentials available to EODH commercial data flows.'

  return (
    <Flex direction="column" gap="3" className={styles.providerCard}>
      <Flex align="center" gap="2">
        <Text size="4" weight="medium">
          Open Cosmos
        </Text>
        <Badge color={isConnected ? 'green' : 'gray'} variant="soft">
          {statusText}
        </Badge>
      </Flex>
      <Text size="2" color="gray">
        {description}
      </Text>
      {error && <Callout type="error" message={error} />}
      {!isConnected && (
        <TextField.Root
          placeholder="Enter your Open Cosmos organization ID"
          inputMode="numeric"
          value={organizationId}
          disabled={!canEdit}
          onChange={(e) => setOrganizationId(e.target.value.replace(/\D/g, ''))}
        />
      )}
      <Flex>
        {isConnected ? (
          <Button disabled={!canEdit || isLoading} onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button
            disabled={!canEdit || !hasConfiguration || isLoading || !hasValidOrganizationId}
            onClick={() => void connect(Number(organizationId))}
          >
            Connect Open Cosmos
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

export const ProviderAccountsPage: React.FC = () => {
  const { token, currentWorkspace, userInfo } = useContext(AuthenticationContext)

  const { data: accounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['Accounts', userInfo?.sub],
    queryFn: () => fetchAccounts(token),
    refetchOnWindowFocus: false,
    enabled: Boolean(token),
  })

  // Mirrors the real ownership check the backend enforces on linked-account changes: only
  // the owner of the billing account this workspace belongs to may link or unlink providers.
  const canEdit = Boolean(
    accounts?.some((account) => account.workspaces?.some((ws) => ws.name === currentWorkspace)),
  )

  const {
    data: linkedAccounts,
    isLoading,
    error,
    refetch,
  } = useQuery<string[]>({
    queryKey: ['LinkedAccounts', currentWorkspace, userInfo?.sub],
    queryFn: () => fetchLinkedAccounts(currentWorkspace!, token!),
    refetchOnWindowFocus: false,
    enabled: Boolean(token && currentWorkspace),
  })

  return (
    <Flex direction="column" gap="7" className={styles.mainContainer}>
      <Flex direction="column" gap="3">
        <Text size="7" weight="medium">
          Provider accounts
        </Text>
        <Text size="3" color="gray">
          Link commercial data provider accounts so this workspace can order their imagery.
        </Text>
      </Flex>

      {token && currentWorkspace && !isAccountsLoading && !canEdit && (
        <Callout
          type="info"
          message="Only the owner of this workspace's billing account can link or unlink provider accounts."
        />
      )}

      {!token && <Callout type="info" message="Sign in to view provider accounts." />}
      {token && !currentWorkspace && (
        <Callout type="info" message="Select a workspace to view its provider accounts." />
      )}
      {error && (
        <Callout
          type="error"
          message={error instanceof Error ? error.message : 'Failed to load linked accounts.'}
        />
      )}

      {isLoading ? (
        <LoadingIndicator size="3" />
      ) : (
        token &&
        currentWorkspace && (
          <Flex direction="column" gap="5">
            {(['airbus', 'planet'] as LinkedAccountProvider[]).map((provider) => (
              <ProviderKeyCard
                key={provider}
                provider={provider}
                isLinked={Boolean(linkedAccounts?.includes(provider))}
                canEdit={canEdit}
                workspace={currentWorkspace}
                token={token}
                onChanged={() => void refetch()}
              />
            ))}
            <OpenCosmosCard canEdit={canEdit} />
          </Flex>
        )
      )}
    </Flex>
  )
}
