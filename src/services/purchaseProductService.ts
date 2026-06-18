import { Item } from '@/types'
import { fetchWorkspaceTokens } from './workspaceTokenService'

export interface RadarOptions {
  orbit?: string
  resolutionVariant?: string
  projection?: string
}

export interface PurchaseRequest {
  workspace: string | undefined
  token: string | undefined
  provider: 'airbus_optical' | 'airbus_sar' | 'planet' | 'opencosmos'
  productBundle?: string
  coordinates?: number[][][]
  radarOptions?: RadarOptions
  endUserCountry?: string
  licence?: string
  item: Item
}

export const purchaseProduct = async ({
  workspace,
  token,
  provider,
  productBundle,
  coordinates,
  radarOptions,
  endUserCountry,
  licence,
  item,
}: PurchaseRequest): Promise<unknown> => {
  if (!workspace) {
    throw new Error('Workspace is required for placing an order.')
  }

  if (!token) {
    throw new Error('No token found. You need to be logged in to place an order')
  }

  const { access } = await fetchWorkspaceTokens(workspace, token)

  const itemLink = item.links.find((link) => link.rel === 'self')?.href

  if (!itemLink) {
    throw new Error("No 'self' link found in item.")
  }

  const purchaseApiUrl = `${itemLink}/order`

  const requestBody: Record<string, unknown> = {}

  if (provider === 'opencosmos') {
    requestBody.productBundle = 'General Use'
  } else {
    requestBody.productBundle = productBundle
  }

  // Only add coordinates if applicable (Airbus Optical & Planet)
  if ((provider === 'airbus_optical' || provider === 'planet') && coordinates) {
    requestBody.coordinates = coordinates
  }

  // Add endUserCountry for PNEO orders or Airbus Optical/SAR providers
  if (
    (item.collection === 'airbus_pneo_data' ||
      provider === 'airbus_optical' ||
      provider === 'airbus_sar') &&
    endUserCountry
  ) {
    requestBody.endUserCountry = endUserCountry
  }

  // Only add licence if applicable (Airbus Optical & Airbus SAR)
  if ((provider === 'airbus_optical' || provider === 'airbus_sar') && licence) {
    requestBody.licence = licence
  }

  // Always include parameters if provided (Airbus SAR & Optical)
  if (radarOptions && Object.keys(radarOptions).length > 0) {
    requestBody.radarOptions = radarOptions
  }

  try {
    const response = await fetch(purchaseApiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Order request failed: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.json()

    return { success: true, data: responseData }
  } catch (error) {
    throw new Error('Failed to complete the order request.')
  }
}
