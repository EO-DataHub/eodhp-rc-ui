import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Callout,
  Code,
  DataList,
  Dialog,
  Flex,
  Spinner,
  Text,
} from '@radix-ui/themes'
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { toast } from 'react-toastify'
import { getSelfLinkHref } from '@/library/integrationTools'
import type { DemoNotebook, SavedSet, SetItem } from '../demoTypes'
import { DEMO_COLLECTIONS, SEED_NOTEBOOKS } from '../mockData'
import { collectionsOf } from '../setUtils'
import { DemoBadge } from './DemoBadge'
import styles from './demo.module.scss'

type Step = 'choose' | 'review' | 'opening' | 'opened'

/** How many item links the parameters preview shows before summarising the rest. */
const PREVIEW_LINKS = 3

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const itemLink = (item: SetItem) =>
  (item.pinned && getSelfLinkHref(item.pinned)) ??
  `https://eodatahub.org.uk/api/catalogue/stac/catalogs/public/collections/${item.collection}/items/${item.id}`

const datasetNames = (datasets: string[]) =>
  datasets.map((id) => DEMO_COLLECTIONS.find((c) => c.id === id)?.title ?? id).join(', ')

const notebookSupport = (notebook: DemoNotebook, set: SavedSet) => {
  const count = set.items.length
  if (count === 0) return { supported: false, reason: 'This set is empty.' }

  const unsupported =
    notebook.datasets === 'any'
      ? []
      : collectionsOf(set).filter((c) => !(notebook.datasets as string[]).includes(c))
  if (notebook.datasets !== 'any' && unsupported.length > 0) {
    return { supported: false, reason: `Only works with ${datasetNames(notebook.datasets)}.` }
  }
  if (notebook.input === 'stac-item' && count > 1) {
    return {
      supported: false,
      reason: 'Works on one item at a time. Open it from an item on the map instead.',
    }
  }
  if (notebook.minItems && count < notebook.minItems) {
    return { supported: false, reason: `Needs at least ${notebook.minItems} items.` }
  }
  return {
    supported: true,
    reason: count === 1 ? 'Opens with this item loaded' : `Opens with all ${count} items loaded`,
  }
}

const parametersCell = (set: SavedSet) => {
  const links = set.items.map(itemLink)
  const shown = links.slice(0, PREVIEW_LINKS).map((link) => `    "${link}",`)
  const more =
    links.length > PREVIEW_LINKS ? [`    # …and ${links.length - PREVIEW_LINKS} more`] : []
  return [
    '# Parameters added by the EO DataHub',
    `WORKSPACE = "${set.workspace}"`,
    `SET_NAME = "${set.name}"`,
    'STAC_ITEM_LINKS = [',
    ...shown,
    ...more,
    ']',
  ].join('\n')
}

interface OpenNotebookDialogProps {
  set?: SavedSet
  onClose: () => void
}

export const OpenNotebookDialog = ({ set, onClose }: OpenNotebookDialogProps) => {
  const [step, setStep] = useState<Step>('choose')
  const [notebookId, setNotebookId] = useState<string>()

  useEffect(() => {
    if (!set) return
    setStep('choose')
    setNotebookId(undefined)
  }, [set])

  // Pretend to wait for JupyterHub, so the hand-off feels like the real thing.
  useEffect(() => {
    if (step !== 'opening') return
    const id = window.setTimeout(() => setStep('opened'), 1500)
    return () => window.clearTimeout(id)
  }, [step])

  if (!set) return null

  const notebook = SEED_NOTEBOOKS.find((n) => n.id === notebookId)
  const copyName = notebook
    ? `notebooks/${notebook.fileName.replace(/\.ipynb$/, '')}-${slugify(set.name)}.ipynb`
    : ''
  const cell = parametersCell(set)

  const copyParameters = () => {
    navigator.clipboard
      .writeText(cell)
      .then(() => toast.success('Parameters copied', { autoClose: 2500 }))
      .catch(() => toast.error('Could not copy the parameters', { autoClose: 2500 }))
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="640px">
        <Flex justify="between" align="start" gap="3">
          <Dialog.Title mb="1">
            {step === 'choose' ? 'Open in a notebook' : notebook?.title ?? 'Open in a notebook'}
          </Dialog.Title>
          <DemoBadge />
        </Flex>
        <Dialog.Description size="2" color="gray" mb="3">
          {step === 'choose'
            ? `Choose a notebook to open with the ${set.items.length} items in '${set.name}'. Notebooks that can't use this set are greyed out.`
            : `With the ${set.items.length} items in '${set.name}'.`}
        </Dialog.Description>

        {step === 'choose' && (
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="2" className={styles.workflowList}>
              {SEED_NOTEBOOKS.map((n) => {
                const support = notebookSupport(n, set)
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`${styles.workflowOption} ${n.id === notebookId ? styles.workflowOptionSelected : ''}`}
                    disabled={!support.supported}
                    onClick={() => setNotebookId(n.id)}
                  >
                    <Flex direction="column" gap="1" align="start">
                      <Flex gap="2" align="center" wrap="wrap">
                        <Text weight="bold">{n.title}</Text>
                        <Badge color="green" variant="soft">
                          EODH catalogue
                        </Badge>
                      </Flex>
                      <Text size="2" color="gray" align="left">
                        {n.description}
                      </Text>
                      <Flex gap="1" align="center">
                        {support.supported ? (
                          <CheckCircledIcon color="var(--green-9)" />
                        ) : (
                          <CrossCircledIcon color="var(--gray-9)" />
                        )}
                        <Text size="1" color={support.supported ? 'green' : 'gray'}>
                          {support.reason}
                        </Text>
                      </Flex>
                    </Flex>
                  </button>
                )
              })}
            </Flex>
            <Flex justify="end" gap="3" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button disabled={!notebook} onClick={() => setStep('review')}>
                Next
              </Button>
            </Flex>
          </Flex>
        )}

        {step === 'review' && notebook && (
          <Flex direction="column" gap="4">
            <DataList.Root>
              <DataList.Item>
                <DataList.Label>Notebook</DataList.Label>
                <DataList.Value>{notebook.title}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Items</DataList.Label>
                <DataList.Value>
                  {set.items.length} items from &apos;{set.name}&apos;
                </DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Opens in</DataList.Label>
                <DataList.Value>JupyterHub, in workspace {set.workspace}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Saved as</DataList.Label>
                <DataList.Value>
                  <span className={styles.code}>{copyName}</span>
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Added to the top of the notebook
              </Text>
              <Code size="2" variant="soft" style={{ whiteSpace: 'pre', padding: '0.75rem' }}>
                {cell}
              </Code>
            </Flex>

            <Callout.Root color="blue" size="1">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                The Hub saves a copy of the notebook to your workspace with these values filled in.
                The notebook gets the items as they are now. Your set isn&apos;t changed.
              </Callout.Text>
            </Callout.Root>

            <Flex justify="between" gap="3" mt="2">
              <Button variant="soft" color="gray" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button onClick={() => setStep('opening')}>Open in JupyterHub</Button>
            </Flex>
          </Flex>
        )}

        {step === 'opening' && (
          <Flex align="center" gap="3" py="6" justify="center">
            <Spinner size="3" />
            <Text>Preparing your notebook in {set.workspace}…</Text>
          </Flex>
        )}

        {step === 'opened' && notebook && (
          <Flex direction="column" gap="4">
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                In the real Hub, JupyterHub opens in a new tab here, with{' '}
                <strong>{notebook.title}</strong> saved as <strong>{copyName}</strong> and the{' '}
                {set.items.length} items already loaded. This demo stops here because it can&apos;t
                run Jupyter.
              </Callout.Text>
            </Callout.Root>
            <Flex justify="end" gap="3">
              <Button variant="soft" color="gray" onClick={copyParameters}>
                Copy parameters
              </Button>
              <Dialog.Close>
                <Button>Done</Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
