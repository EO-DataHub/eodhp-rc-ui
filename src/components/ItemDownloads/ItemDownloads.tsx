import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Checkbox, Flex, Heading, Link, Table, Tabs, Text } from '@radix-ui/themes'
import { CheckIcon, CopyIcon } from '@radix-ui/react-icons'
import { toast } from 'react-toastify'
import DownloadIcon from '@/assets/icons/download-filled.svg?react'
import type { Collection, Item } from '@/types'
import { formatFileSize } from '@/library/fileUtils'
import { downloadWithToken, triggerStaggeredDownloads } from '@/library/assetDownload'
import {
  assetFilenames,
  buildBashScript,
  buildPythonScript,
  getCatalogPath,
  getScriptHubBaseUrl,
  isEodhHost,
  TOKEN_PLACEHOLDER,
  type DownloadScriptParams,
} from '@/library/downloadScripts'
import { getItemSelfHref } from '@/library/savedSetItems'
import { useAnalyticsActions } from '@/hooks/useGoogleAnalyticsActions'
import { useWorkspaceToken } from '@/hooks/useWorkspaceToken'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import styles from './ItemDownloads.module.scss'

const HUB_BASE_URL = (import.meta.env.VITE_HUB_BASE_URL as string | undefined)?.replace(/\/$/, '')

interface AssetDetails {
  href: string
  title?: string
  type?: string
  size?: number
  'file:size'?: number
}

interface ItemDownloadsProps {
  item: Item
  collection?: Collection | null
  /** Private items need a DataHub API token in the scripts. */
  isPrivate: boolean
  workspace?: string
}

const useCopy = (onCopied: () => void) => {
  const [isCopied, setIsCopied] = useState(false)
  const copy = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success(successMessage)
      onCopied()
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }
  return { isCopied, copy }
}

const CodeBlock: React.FC<{ code: string; label: string; onCopied: () => void }> = ({
  code,
  label,
  onCopied,
}) => {
  const { isCopied, copy } = useCopy(onCopied)
  return (
    <Flex direction="column" gap="2">
      <pre className={styles.code}>{code}</pre>
      <Button
        style={{ alignSelf: 'flex-start' }}
        onClick={() => void copy(code, `${label} script copied to clipboard`)}
        variant="soft"
        size="2"
        color={isCopied ? 'green' : 'blue'}
      >
        {isCopied ? (
          <>
            <CheckIcon width="16" height="16" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon width="16" height="16" />
            Copy {label} script
          </>
        )}
      </Button>
    </Flex>
  )
}

// ItemDownloads lists an item's assets as plain links (so download manager extensions can
// find them) and offers a staggered "Download all" plus generated download scripts.
export const ItemDownloads: React.FC<ItemDownloadsProps> = ({
  item,
  collection,
  isPrivate,
  workspace,
}) => {
  const { trackDownloadItemImagery, trackDownloadAllItemImagery, trackCopyDownloadScript } =
    useAnalyticsActions()
  const { token, userInfo, isAuthenticated } = useContext(AuthenticationContext)
  const { data: workspaceTokens } = useWorkspaceToken(
    workspace,
    token,
    userInfo?.sub,
    isPrivate && isAuthenticated,
  )

  const assets = useMemo(
    () =>
      Object.entries(item.assets ?? {}).map(([key, asset]) => ({
        key,
        ...(asset as AssetDetails),
      })),
    [item.assets],
  )
  const filenames = useMemo(() => assetFilenames(assets), [assets])

  const [selected, setSelected] = useState<Set<string>>(() => new Set(assets.map((a) => a.key)))
  useEffect(() => {
    setSelected(new Set(assets.map((a) => a.key)))
  }, [assets])

  // Cancels downloads not yet started when the user leaves the page
  const cancelDownloadsRef = useRef<(() => void) | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      cancelDownloadsRef.current?.()
      abortControllerRef.current?.abort()
    },
    [],
  )
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  // True until the last browser download has started, so a second click can't restart them
  const [isStarting, setIsStarting] = useState(false)

  const selectedAssets = assets.filter((asset) => selected.has(asset.key))
  const allSelected = selectedAssets.length === assets.length

  const toggle = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const handleDownloadSelected = () => {
    trackDownloadAllItemImagery({
      item,
      assetCount: assets.length,
      selectedCount: selectedAssets.length,
    })
    // Workspace-hosted files need the token; anything else (public data, third-party
    // quicklooks) is fetched directly and must never get the token
    const accessToken = isPrivate ? workspaceTokens?.access : undefined
    const needsToken = (href: string) => !!accessToken && isEodhHost(href, HUB_BASE_URL)
    const tokenFiles = selectedAssets.filter((a) => needsToken(a.href))
    const otherFiles = selectedAssets.filter((a) => !needsToken(a.href))

    if (otherFiles.length > 0) {
      setIsStarting(true)
      cancelDownloadsRef.current = triggerStaggeredDownloads(
        otherFiles.map((a) => a.href),
        { onStarted: () => setIsStarting(false) },
      )
    }

    if (accessToken && tokenFiles.length > 0) {
      const controller = new AbortController()
      abortControllerRef.current = controller
      void downloadWithToken(
        tokenFiles.map((a) => ({ href: a.href, filename: filenames.get(a.key) ?? a.key })),
        accessToken,
        { signal: controller.signal, onProgress: (done, total) => setProgress({ done, total }) },
      ).then((failed) => {
        if (controller.signal.aborted) return
        setProgress(null)
        if (failed.length > 0) {
          toast.error(
            `${failed.length} of ${tokenFiles.length} files failed to download: ${failed
              .map((f) => f.filename)
              .join(', ')}`,
          )
        }
      })
    }
  }

  const scriptParams: DownloadScriptParams = {
    assets: selectedAssets,
    allSelected,
    itemId: item.id,
    collectionId: collection?.id ?? item.collection,
    catalogPath: getCatalogPath(collection),
    itemSelfHref: getItemSelfHref(item),
    isPrivate,
    workspace,
    hubBaseUrl: getScriptHubBaseUrl(collection, HUB_BASE_URL),
    filenames,
  }

  if (assets.length === 0) {
    return <Text>No assets available.</Text>
  }

  return (
    <Flex direction="column" gap="6">
      <Flex direction="column" gap="3">
        <Flex gap="4" align="center" wrap="wrap">
          <Text size="2" color="gray">
            {selectedAssets.length} of {assets.length} selected
          </Text>
          <Button
            size="1"
            variant="ghost"
            onClick={() => setSelected(new Set(assets.map((a) => a.key)))}
          >
            Select all
          </Button>
          <Button size="1" variant="ghost" color="gray" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </Flex>

        <Table.Root variant="surface" size="1">
          <Table.Header>
            <Table.Row align="center">
              <Table.ColumnHeaderCell width="40px">
                <Checkbox
                  aria-label="Select all assets"
                  checked={allSelected ? true : selectedAssets.length > 0 ? 'indeterminate' : false}
                  onCheckedChange={(checked) =>
                    setSelected(checked === true ? new Set(assets.map((a) => a.key)) : new Set())
                  }
                />
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>File</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Size</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {assets.map((asset) => {
              const size = asset['file:size'] ?? asset.size
              return (
                <Table.Row key={asset.key} align="center">
                  <Table.Cell>
                    <Checkbox
                      aria-label={`Select ${asset.key}`}
                      checked={selected.has(asset.key)}
                      onCheckedChange={(checked) => toggle(asset.key, checked === true)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Flex direction="column">
                      <Link
                        href={asset.href}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        weight="medium"
                        onClick={() =>
                          trackDownloadItemImagery({ assetKey: asset.key, asset, item })
                        }
                      >
                        {asset.title ?? asset.key}
                      </Link>
                      <Text size="1" color="gray" className={styles.filename}>
                        {filenames.get(asset.key)}
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray" className={styles.filename}>
                      {asset.type ?? 'N/A'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1">{typeof size === 'number' ? formatFileSize(size) : 'N/A'}</Text>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>

        <Box>
          <Button
            disabled={selectedAssets.length === 0 || progress !== null || isStarting}
            onClick={handleDownloadSelected}
          >
            <DownloadIcon />
            {progress
              ? `Downloading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
              : isStarting
                ? 'Starting downloads…'
                : allSelected
                  ? `Download all (${assets.length})`
                  : `Download selected (${selectedAssets.length})`}
          </Button>
        </Box>
        <Text size="2" color="gray">
          Downloads each file separately. Your browser may ask permission to download multiple
          files, may block some of them, or may open images and metadata files instead of saving
          them. For more than a few files, use one of the options below.
        </Text>
        {isPrivate && (
          <Text size="2" color="gray">
            Files in your workspace download one at a time and are held in your browser&apos;s
            memory until each one is saved. For very large files, use the scripts below.
          </Text>
        )}
      </Flex>

      <Flex direction="column" gap="2">
        <Heading as="h3" size="3">
          Browser extension
        </Heading>
        <Text size="2">
          A download manager extension such as{' '}
          <Link href="https://www.downthemall.org/" target="_blank" rel="noopener noreferrer">
            DownThemAll!
          </Link>{' '}
          can save every link on this page in one go. Install it, then run it on this page and
          filter to the files you want.
        </Text>
      </Flex>

      <Flex direction="column" gap="3">
        <Heading as="h3" size="3">
          Download with code
        </Heading>
        <Text size="2">
          Copy a script to download the selected files from Python (using{' '}
          <Link href="https://pyeodh.readthedocs.io/" target="_blank" rel="noopener noreferrer">
            pyeodh
          </Link>
          ) or the command line (using curl).
        </Text>
        {isPrivate && (
          <Text size="2">
            Replace <code>{TOKEN_PLACEHOLDER}</code> with a DataHub API token for workspace{' '}
            <code>{workspace ?? 'your workspace'}</code>.{' '}
            <Link asChild>
              <RouterLink to="/settings/credentials">Create a token</RouterLink>
            </Link>
            .
          </Text>
        )}
        {selectedAssets.length === 0 ? (
          <Text size="2" color="gray">
            Select at least one file to generate a script.
          </Text>
        ) : (
          <Tabs.Root defaultValue="python">
            <Tabs.List size="1">
              <Tabs.Trigger value="python">Python</Tabs.Trigger>
              <Tabs.Trigger value="bash">Bash</Tabs.Trigger>
            </Tabs.List>
            <Box pt="3">
              <Tabs.Content value="python">
                <CodeBlock
                  code={buildPythonScript(scriptParams)}
                  label="Python"
                  onCopied={() =>
                    trackCopyDownloadScript({
                      item,
                      language: 'python',
                      selectedCount: selectedAssets.length,
                    })
                  }
                />
              </Tabs.Content>
              <Tabs.Content value="bash">
                <CodeBlock
                  code={buildBashScript(scriptParams)}
                  label="Bash"
                  onCopied={() =>
                    trackCopyDownloadScript({
                      item,
                      language: 'bash',
                      selectedCount: selectedAssets.length,
                    })
                  }
                />
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        )}
      </Flex>
    </Flex>
  )
}
