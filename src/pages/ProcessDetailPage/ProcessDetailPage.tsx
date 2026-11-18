/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Flex, Box, Text, Container, Button, Badge } from '@radix-ui/themes'
import { fetchItemById } from '@/services/processCatalogueService'
import type { ProcessDetail } from '@/types'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { RunWorkflowDialog } from '@/components/RunWorkflowDialog/RunWorkflowDialog'

export const ProcessDetailPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>()
  const [data, setData] = useState<ProcessDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
  const { isAuthenticated } = useContext(AuthenticationContext)

  useEffect(() => {
    if (!itemId) {
      setNotFound(true)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setError(null)
    setNotFound(false)
    setIsLoading(true)

    void fetchItemById(itemId).then(({ data: result, error: err, notFound: nf }) => {
      if (cancelled) return
      setIsLoading(false)
      if (nf) {
        setNotFound(true)
        setData(null)
        return
      }
      if (err) {
        setError(err)
        setData(null)
        return
      }
      setData(result ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [itemId])

  useEffect(() => {
    if (data) {
      document.title = `${data.properties?.title ?? 'Process'} | Processes Catalogue`
    }
    return () => {
      document.title = 'EODH Resource Catalog'
    }
  }, [data])

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '40vh' }}>
        <Text>Loading…</Text>
      </Flex>
    )
  }

  if (notFound ? true : !itemId) {
    return (
      <Container align="center" maxWidth="1640px">
        <Flex direction="column" gap="4" p="6" align="center">
          <Text>Item not found.</Text>
          <Link to="/catalogue/processes">
            <Button>Back to Processes Catalogue</Button>
          </Link>
        </Flex>
      </Container>
    )
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- logical OR required
  if (error || !data) {
    return (
      <Container align="center" maxWidth="1640px">
        <Flex direction="column" gap="4" p="6" align="center">
          <Text color="red">{error ?? 'Failed to load item.'}</Text>
          <Link to="/catalogue/processes">
            <Button>Back to Processes Catalogue</Button>
          </Link>
        </Flex>
      </Container>
    )
  }

  const props = data.properties
  const title = props?.title ?? 'Untitled'
  const type = props?.type ?? 'workflow'
  const description = props?.description
  const keywords = props?.keywords ?? []
  const applicableCollections = props?.applicableCollections ?? []
  const contacts = props?.contacts ?? []
  const links = data.links ?? []

  return (
    <Container align="center" maxWidth="1640px">
      <Flex direction="column" gap="4" p="6">
        <Flex gap="2" align="center">
          <Link to="/catalogue/processes" style={{ textDecoration: 'none' }}>
            <Text size="2" color="gray">
              Processes Catalogue
            </Text>
          </Link>
          <Text size="2" color="gray">
            /
          </Text>
          <Text size="2" weight="medium">
            {title}
          </Text>
        </Flex>

        <Badge size="2" variant="soft" color="blue" style={{ width: 'fit-content' }}>
          {type === 'notebook' ? 'Notebook' : 'Workflow'}
        </Badge>

        <Text size="6" weight="bold">
          {title}
        </Text>

        {description ? (
          <Box>
            <Text size="2" weight="bold" mb="2" as="div">
              Description
            </Text>
            <Text size="2" as="p">
              {description}
            </Text>
          </Box>
        ) : null}

        {keywords.length > 0 ? (
          <Box>
            <Text size="2" weight="bold" mb="2" as="div">
              Keywords
            </Text>
            <Flex gap="2" wrap="wrap">
              {keywords.map((k, i) => (
                <Badge key={i} size="1" variant="outline">
                  {k}
                </Badge>
              ))}
            </Flex>
          </Box>
        ) : null}

        {applicableCollections.length > 0 ? (
          <Box>
            <Text size="2" weight="bold" mb="2" as="div">
              Applicable Collections
            </Text>
            <Flex gap="2" wrap="wrap">
              {applicableCollections.map((c, i) => (
                <Badge key={i} size="1" variant="soft">
                  {c}
                </Badge>
              ))}
            </Flex>
          </Box>
        ) : null}

        {contacts.length > 0 ? (
          <Box>
            <Text size="2" weight="bold" mb="2" as="div">
              Contacts
            </Text>
            <Flex direction="column" gap="1">
              {(contacts as { name?: string; organization?: string }[]).map((c, i) => (
                <Text key={i} size="2">
                  {c.name}
                  {c.organization ? ` (${c.organization})` : ''}
                </Text>
              ))}
            </Flex>
          </Box>
        ) : null}

        {links.length > 0 ? (
          <Box>
            <Text size="2" weight="bold" mb="2" as="div">
              Links
            </Text>
            <Flex direction="column" gap="1">
              {links.map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 'var(--font-size-2)' }}
                >
                  {link.title ?? link.rel ?? link.href}
                </a>
              ))}
            </Flex>
          </Box>
        ) : null}

        {type === 'notebook' ? (
          <Box>
            <Text size="2" color="gray">
              To launch this notebook, go to the Data Catalogue, find your data, open Integration
              tools, and then select the Notebook tab.
            </Text>
          </Box>
        ) : null}
        <Flex gap="3" align="center">
          {type === 'notebook' ? null : (
            <>
              <Button size="2" disabled={!isAuthenticated} onClick={() => setIsRunDialogOpen(true)}>
                Run workflow
              </Button>
              {!isAuthenticated && (
                <Text size="2" color="gray">
                  Sign in to run this workflow
                </Text>
              )}
            </>
          )}
          <Link to="/catalogue/processes">
            <Button variant="soft" size="2">
              Back to Processes Catalogue
            </Button>
          </Link>
        </Flex>
      </Flex>
      {type === 'notebook' ? null : (
        <RunWorkflowDialog
          open={isRunDialogOpen}
          onOpenChange={setIsRunDialogOpen}
          workflow={data}
        />
      )}
    </Container>
  )
}
