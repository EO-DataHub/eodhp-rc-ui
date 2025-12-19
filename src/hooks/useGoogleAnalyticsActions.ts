import { Collection, Item, DownloadableAsset } from '@/types'
import ReactGA from 'react-ga4'
import { useContext } from 'react'
import { AuthenticationContext } from '@/context/AuthenticationContext'

export const useAnalyticsActions = () => {
  const { userInfo, isAuthenticated } = useContext(AuthenticationContext)

  const getUserParams = () => {
    if (isAuthenticated && userInfo) {
      return {
        id: userInfo.sub,
        auth_status: 'logged_in',
      }
    }
    return {
      id: 'N/A',
      auth_status: 'guest',
    }
  }

  const trackCollectionVisualization = (collection: Collection) => {
    ReactGA.event('view_collection', {
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
    ReactGA.event('download_collection_imagery', {
      ...getUserParams(),
      collection_id: collection.id,
      asset_key: assetKey,
      file: asset.href,
      roles: asset.roles?.join(',') ?? 'N/A',
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
    const collectionRef = item.collectionRef

    const isCommercial =
      Boolean(item.isLicenseProprietary) || collectionRef?.license === 'proprietary'

    const providers = collectionRef?.providers?.map((p) => p.name).join(',') ?? 'N/A'

    ReactGA.event('download_item_imagery', {
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
    ReactGA.event('purchase_imagery', {
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

  return {
    trackCollectionVisualization,
    trackDownloadCollectionImagery,
    trackDownloadItemImagery,
    trackPurchasedImagery,
  }
}
