import { Collection, Item, DownloadableAsset } from '@/types'
import { useContext, useEffect, useState } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { hashSHA256 } from '@/library/hashUtils'
import { safeEvent } from '@/library/googleAnalyticsClient'
import { useAnalyticsConsent } from '@/context/AnalyticsConsentContext'

export const useAnalyticsActions = () => {
  const { isAuthenticating, isAuthenticated, userInfo } = useContext(AuthenticationContext)
  const { consent } = useAnalyticsConsent()
  const [userTrackingId, setUserTrackingId] = useState<string>('anonymous')

  useEffect(() => {
    if (consent !== 'granted') {
      setUserTrackingId('anonymous')
      return
    }
    // Auth not ready or user not authenticated
    if (isAuthenticating || !isAuthenticated || !userInfo?.sub) {
      setUserTrackingId('anonymous')
      return
    }

    const userSub = userInfo.sub
    const resolveUserTrackingId = async () => {
      const hashed = await hashSHA256(userSub)
      setUserTrackingId(hashed ?? 'anonymous')
    }
    void resolveUserTrackingId()
  }, [consent, isAuthenticating, isAuthenticated, userInfo?.sub])

  const getUserParams = () => ({
    user_id: userTrackingId,
    auth_status: isAuthenticated ? 'logged_in' : 'guest',
  })

  const trackCollectionVisualization = (collection: Collection) => {
    if (consent !== 'granted') return

    safeEvent('view_collection', {
      ...getUserParams(),
      collection_id: collection.id,
      collection_title: collection.displayedTitle ?? collection.title ?? collection.id,
    })
  }

  const trackDownloadCollectionImagery = ({
    assetKey,
    asset,
    collection,
  }: {
    assetKey: string
    asset: DownloadableAsset
    collection: Collection
  }) => {
    if (consent !== 'granted') return

    const isCommercial = collection.license === 'proprietary'

    safeEvent('download_collection_imagery', {
      ...getUserParams(),
      collection_id: collection.id,
      asset_key: assetKey,
      file: asset.href,
      roles: asset.roles?.join(',') ?? 'N/A',
      data_type: isCommercial ? 'commercial' : 'open',
    })
  }

  const trackDownloadItemImagery = ({
    assetKey,
    asset,
    item,
  }: {
    assetKey: string
    asset: DownloadableAsset
    item: Item
  }) => {
    if (consent !== 'granted') return

    const collectionRef = item.collectionRef

    const isCommercial =
      Boolean(item.isLicenseProprietary) || collectionRef?.license === 'proprietary'

    const providers = collectionRef?.providers?.map((p) => p.name).join(',') ?? 'N/A'

    safeEvent('download_item_imagery', {
      ...getUserParams(),
      item_id: item.id,
      collection_id: collectionRef?.id ?? 'N/A',
      collection_title: collectionRef?.displayedTitle ?? collectionRef?.title ?? 'N/A',
      providers,
      asset_key: assetKey,
      file: asset.href,
      roles: asset.roles?.join(',') ?? 'N/A',
      data_type: isCommercial ? 'commercial' : 'open',
      is_preview: asset.roles?.includes('thumbnail') ?? false,
    })
  }

  const trackPurchasedImagery = ({
    item,
    collection,
    provider,
    productBundle,
    workspace,
    price,
    currency,
    isPartialScene,
  }: {
    item: Item
    collection: Collection
    provider: string
    productBundle: string
    workspace?: string
    price?: number
    currency?: string
    isPartialScene: boolean
  }) => {
    if (consent !== 'granted') return

    safeEvent('purchase_imagery', {
      ...getUserParams(),
      item_id: item.id,
      collection_id: collection.id,
      provider,
      product_bundle: productBundle,
      workspace,
      price,
      currency,
      partial_scene: isPartialScene,
    })
  }

  const getItemParams = (item: Item) => {
    const collectionRef = item.collectionRef
    const isCommercial =
      Boolean(item.isLicenseProprietary) || collectionRef?.license === 'proprietary'
    return {
      item_id: item.id,
      collection_id: collectionRef?.id ?? item.collection ?? 'N/A',
      data_type: isCommercial ? 'commercial' : 'open',
    }
  }

  const trackViewItemDownloads = ({
    item,
    assetCount,
    source,
  }: {
    item: Item
    assetCount: number
    source: string
  }) => {
    if (consent !== 'granted') return

    safeEvent('view_item_downloads', {
      ...getUserParams(),
      ...getItemParams(item),
      asset_count: assetCount,
      source,
    })
  }

  const trackDownloadAllItemImagery = ({
    item,
    assetCount,
    selectedCount,
  }: {
    item: Item
    assetCount: number
    selectedCount: number
  }) => {
    if (consent !== 'granted') return

    safeEvent('download_all_item_imagery', {
      ...getUserParams(),
      ...getItemParams(item),
      asset_count: assetCount,
      selected_count: selectedCount,
    })
  }

  const trackCopyDownloadScript = ({
    item,
    language,
    selectedCount,
  }: {
    item: Item
    language: 'python' | 'bash' | 'powershell'
    selectedCount: number
  }) => {
    if (consent !== 'granted') return

    safeEvent('copy_download_script', {
      ...getUserParams(),
      ...getItemParams(item),
      language,
      selected_count: selectedCount,
    })
  }

  return {
    trackCollectionVisualization,
    trackDownloadCollectionImagery,
    trackDownloadItemImagery,
    trackPurchasedImagery,
    trackViewItemDownloads,
    trackDownloadAllItemImagery,
    trackCopyDownloadScript,
  }
}
