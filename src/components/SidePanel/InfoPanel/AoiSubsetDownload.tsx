import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useSelector } from '@xstate/store/react'
import { Button, Flex, IconButton, Text, Tooltip } from '@radix-ui/themes'
import { CheckIcon, CopyIcon } from '@radix-ui/react-icons'
import { toast } from 'react-toastify'
import type { Item } from '@/types'
import DownloadIcon from '@/assets/icons/download-filled.svg?react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useAnalyticsActions } from '@/hooks/useGoogleAnalyticsActions'
import { fetchCogInfo } from '@/services/titilerService'
import {
  type AoiSubsetStatus,
  type SubsettableAssetLike,
  formatBytes,
  getAoiSubsetFilename,
  getAoiSubsetStatus,
} from '@/library/aoiSubset'

interface AoiSubsetDownloadProps {
  item: Item
  assetKey: string
  asset: SubsettableAssetLike
}

const LABEL = 'Download AOI subset'

const DisabledButton: React.FC<{ reason: string }> = ({ reason }) => (
  <Flex direction="column" gap="1">
    <Button style={{ alignSelf: 'flex-start' }} variant="outline" disabled>
      <DownloadIcon /> {LABEL}
    </Button>
    <Text size="1" color="gray">
      {reason}
    </Text>
  </Flex>
)

function getDisabledReason(status: AoiSubsetStatus): string | undefined {
  switch (status.state) {
    case 'no-aoi':
      return 'Draw an area of interest on the map to download just that area.'
    case 'no-overlap':
      return "Your area of interest doesn't overlap this file."
    case 'too-large':
      return `The subset would be about ${formatBytes(status.bytes)}, over the ${formatBytes(
        status.maxBytes,
      )} limit. Draw a smaller area of interest.`
    default:
      return undefined
  }
}

// Offers a titiler crop of a GeoTIFF asset to the bounding rectangle of the user's AOI, at the
// file's native resolution and projection. Rendered inside the asset's accordion content, so the
// file info is only requested when the user expands that asset.
export const AoiSubsetDownload: React.FC<AoiSubsetDownloadProps> = ({ item, assetKey, asset }) => {
  const aoi = useSelector(dataFinderStore, (state) => state.context.aoi)
  const { trackDownloadItemImagery } = useAnalyticsActions()
  const [isCopied, setIsCopied] = useState(false)

  // Workspace assets need an auth token that a plain link can't carry
  const isWorkspaceData =
    Boolean(item.isUserCollection) || Boolean(item.collectionRef?.isUserCollection)

  const {
    data: info,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['CogInfo', asset.href],
    queryFn: () => fetchCogInfo(asset.href),
    enabled: !isWorkspaceData,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: 1,
  })

  if (isWorkspaceData) {
    return <DisabledButton reason="Not yet available for workspace data." />
  }
  if (isLoading) {
    return <DisabledButton reason="Checking file…" />
  }
  if (isError || !info) {
    return <DisabledButton reason="This file can't be subset." />
  }

  const status = getAoiSubsetStatus({
    aoi,
    info,
    href: asset.href,
    filename: getAoiSubsetFilename(item.id, assetKey),
  })

  if (status.state !== 'ok') {
    return <DisabledButton reason={getDisabledReason(status) ?? ''} />
  }

  const handleDownload = () => {
    trackDownloadItemImagery({ assetKey, asset, item, aoiSubsetBytes: status.bytes })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(status.url)
      setIsCopied(true)
      toast.success('AOI subset link copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Failed to copy AOI subset link to clipboard')
    }
  }

  return (
    <Flex direction="column" gap="1">
      <Flex gap="2" align="center">
        <Button asChild variant="outline">
          {/* A new tab keeps the app if titiler returns an error page instead of a file */}
          <a href={status.url} target="_blank" rel="noopener noreferrer" onClick={handleDownload}>
            <DownloadIcon /> {LABEL}
          </a>
        </Button>
        <Tooltip content={isCopied ? 'Copied' : 'Copy link'}>
          <IconButton variant="ghost" aria-label="Copy AOI subset link" onClick={handleCopyLink}>
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Tooltip>
      </Flex>
      <Text size="1" color="gray">
        About {formatBytes(status.bytes)}. The rectangle around your area of interest, at the
        file&apos;s native resolution and projection.
      </Text>
      {info.nodata !== null && (
        <Text size="1" color="gray">
          Nodata value: {info.nodata} (not stored in the file; set it in your GIS).
        </Text>
      )}
      {status.warn && (
        <Text size="1" color="amber">
          This is a large download and may be slow or time out.
        </Text>
      )}
    </Flex>
  )
}
