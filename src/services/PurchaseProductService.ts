import { fetchWorkspaceTokens } from './workspaceTokenService'

const API_URL = import.meta.env.VITE_HUB_BASE_URL

export interface RadarOptions {
  orbit?: string
  resolutionVariant?: string
  projection?: string
}

export interface PurchaseRequest {
  workspace: string | undefined
  token: string | undefined
  datasetUrl: string
  provider: 'airbus_optical' | 'airbus_sar' | 'planet'
  productBundle: string
  coordinates?: number[][][]
  radarOptions?: RadarOptions
  endUserCountry?: string
  licence?: string
  parentCatalog: 'supported-datasets' | 'commercial'
  catalog: string | undefined
  collection: string
  item: string
}

export const purchaseProduct = async ({
  workspace,
  token,
  datasetUrl,
  provider,
  productBundle,
  coordinates,
  radarOptions,
  endUserCountry,
  licence,
  parentCatalog,
  catalog,
  collection,
  item,
}: PurchaseRequest): Promise<unknown> => {
  if (!workspace) {
    throw new Error('Workspace is required for placing an order.')
  }

  if (!token) {
    throw new Error('No token found. You need to be logged in to place an order')
  }

  if (!catalog) {
    throw new Error('Catalog cannot be undefined')
  }

  const { access } = await fetchWorkspaceTokens({ workspace, token })

  const purchaseApiUrl = `${API_URL}/api/catalogue/stac/catalogs/${parentCatalog}/catalogs/${catalog}/collections/${collection}/items/${item}/quote`

  const requestBody: Record<string, unknown> = {
    url: datasetUrl,
    product_bundle: productBundle,
  }

  // Only add coordinates if applicable (Airbus Optical & Planet)
  if ((provider === 'airbus_optical' || provider === 'planet') && coordinates) {
    requestBody.coordinates = coordinates
  }

  // Only add endUserCountry if applicable (Airbus Optical & Airbus SAR)
  if ((provider === 'airbus_optical' || provider === 'airbus_sar') && endUserCountry) {
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
