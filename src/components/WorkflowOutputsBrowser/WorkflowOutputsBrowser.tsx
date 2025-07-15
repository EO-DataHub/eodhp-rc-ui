import React, { useEffect, useState } from 'react'
import { Flex, Grid, Text, Button, Link as RadixLink, Inset } from '@radix-ui/themes'
import { Callout } from '@/components/Callout/Callout'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import styles from './WorkflowOutputsBrowser.module.scss'
import DefaultThumbnail from '@/assets/icons/default-thumbnail-wide.jpg'
import { Item } from '@/types'
import { ItemMap } from '@/pages/OrderDetailsPage/ItemMap/ItemMap'
import { IconButton } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useNavigate } from 'react-router-dom'

const BASE_API_URL = import.meta.env.VITE_HUB_BASE_URL ?? 'https://eodatahub.org.uk'
const ROOT_PATH = '/api/catalogue/stac/catalogs/user/'

interface WorkflowOutputsBrowserProps {
  workspace: string | undefined
  token: string | undefined
}

interface StacLink {
  rel: string
  href: string
  title?: string
}

interface Breadcrumb {
  title: string
  href: string
}

export const WorkflowOutputsBrowser: React.FC<WorkflowOutputsBrowserProps> = ({
  workspace,
  token,
}) => {
  const [pathStack, setPathStack] = useState<Breadcrumb[]>([
    {
      title: 'Root',
      href: ROOT_PATH,
    },
  ])
  const [children, setChildren] = useState<StacLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const navigate = useNavigate()

  // Fetch workspace token on mount or when workspace/token changes
  useEffect(() => {
    const fetchToken = async () => {
      if (!workspace || !token) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${BASE_API_URL}/api/workspaces/${workspace}/me/sessions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch workspace token')
        const data = await res.json()
        setWorkspaceToken(data.access)
      } catch (e: unknown) {
        setError('Failed to fetch workspace token')
      } finally {
        setLoading(false)
      }
    }
    void fetchToken()
  }, [workspace, token])

  // Fetch children for the current path
  useEffect(() => {
    const fetchChildren = async () => {
      if (!workspaceToken) return
      setLoading(true)
      setError(null)
      try {
        const url = `${BASE_API_URL}${pathStack[pathStack.length - 1].href}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${workspaceToken}` },
        })
        if (!res.ok) throw new Error('Failed to fetch catalog')
        const data = await res.json()
        const childLinks = (data.links ?? []).filter((l: StacLink) => l.rel === 'child')
        let itemsLink: StacLink | null = null
        if (childLinks.length === 0) {
          itemsLink = (data.links ?? []).find((l: StacLink) => l.rel === 'items') ?? null
        }
        setChildren(childLinks)
        setItemsLink(itemsLink)
      } catch (e: unknown) {
        setError('Failed to fetch catalog')
      } finally {
        setLoading(false)
      }
    }
    void fetchChildren()
  }, [workspaceToken, pathStack])

  const [itemsLink, setItemsLink] = useState<StacLink | null>(null)

  // Fetch items if itemsLink is set and there are no children
  useEffect(() => {
    const fetchItems = async () => {
      if (!itemsLink || children.length > 0) {
        return
      }
      try {
        const url = itemsLink.href.startsWith('http')
          ? itemsLink.href
          : `${BASE_API_URL}${itemsLink.href}`
        const res = await fetch(url, {
          headers: workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch items')
        // No-op: items are not used in this component
      } catch (e: unknown) {
        // No-op: error is not used in this component
      }
    }
    void fetchItems()
  }, [itemsLink, workspaceToken, children])

  const handleCardClick = (link: StacLink) => {
    setPathStack([
      ...pathStack,
      { title: link.title ?? link.href, href: link.href.replace(BASE_API_URL, '') },
    ])
  }

  const handleBreadcrumbClick = (idx: number) => {
    setPathStack(pathStack.slice(0, idx + 1))
  }

  const handleBack = () => {
    if (pathStack.length > 1) {
      setPathStack(pathStack.slice(0, -1))
    }
  }

  return (
    <Flex direction="column" gap="4">
      {/* Breadcrumbs */}
      <Flex align="center" gap="2" mb="2">
        {pathStack.map((crumb, idx) => (
          <span key={idx}>
            {idx > 0 && <Text mx="1">/</Text>}
            <RadixLink
              asChild
              color="blue"
              underline="always"
              style={{ cursor: 'pointer' }}
              onClick={() => handleBreadcrumbClick(idx)}
            >
              <span>{crumb.title}</span>
            </RadixLink>
          </span>
        ))}
        {pathStack.length > 1 && (
          <Button ml="4" size="1" variant="soft" onClick={handleBack}>
            Back
          </Button>
        )}
      </Flex>
      {/* Content */}
      {selectedItem ? (
        <Flex gap="4" align="start" className={styles.itemInfoContainer}>
          <Flex direction="column" style={{ minWidth: 350, flex: 1 }}>
            <ItemMap item={selectedItem} providerType="airbus_optical" />
            <IconButton
              aria-label="Close"
              onClick={() => setSelectedItem(null)}
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
            >
              <Cross2Icon />
            </IconButton>
          </Flex>
          <Flex direction="column" gap="1" className={styles.itemInfo}>
            <Text weight="bold" size="4" style={{ marginBottom: '0.5em' }}>
              {selectedItem.properties?.title ?? selectedItem.id}
            </Text>
            <Text size="2">{selectedItem.id}</Text>
            {selectedItem.properties?.description && (
              <Text size="2">{selectedItem.properties.description}</Text>
            )}
            {/* Add more metadata fields here if desired */}
          </Flex>
        </Flex>
      ) : loading ? (
        <LoadingIndicator size="3" />
      ) : error ? (
        <Callout type="error" message={error} />
      ) : children.length === 0 && itemsLink ? (
        <Flex>
          <Flex
            className={styles.card}
            direction="column"
            style={{
              cursor: 'pointer',
              width: 300,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => {
              const encoded = encodeURIComponent(
                itemsLink.href.startsWith('http')
                  ? itemsLink.href
                  : `${BASE_API_URL}${itemsLink.href}`,
              )
              navigate(`/workflow-outputs/items/${encoded}`)
            }}
          >
            <Inset clip="padding-box" side="top" pb="current">
              <img
                src={DefaultThumbnail}
                className={styles.thumbnail}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = DefaultThumbnail
                }}
              />
            </Inset>
            <Flex direction="column" p="4" justify="center" flexGrow="1" position="relative">
              <Text as="p" size="3" weight="medium" className={styles.text}>
                {itemsLink.title ?? 'View Items'}
              </Text>
              <Text as="p" size="2" mt="2" className={styles.text}>
                {itemsLink.href}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      ) : children.length === 0 ? (
        <Callout type="info" message="No child catalogs or items found at this level." />
      ) : (
        <Grid gap="4" columns={{ lg: '3', md: '2', sm: '1' }}>
          {children.map((link) => (
            <Flex
              key={link.href}
              className={styles.card}
              direction="column"
              onClick={() => handleCardClick(link)}
            >
              <Inset clip="padding-box" side="top" pb="current">
                <img
                  src={DefaultThumbnail}
                  className={styles.thumbnail}
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = DefaultThumbnail
                  }}
                />
              </Inset>
              <Flex direction="column" p="4" justify="center" flexGrow="1" position="relative">
                <Text as="p" size="3" weight="medium" className={styles.text}>
                  {link.title ?? link.href}
                </Text>
                <Text as="p" size="2" mt="2" className={styles.text}>
                  {link.href}
                </Text>
              </Flex>
            </Flex>
          ))}
        </Grid>
      )}
    </Flex>
  )
}

export default WorkflowOutputsBrowser
