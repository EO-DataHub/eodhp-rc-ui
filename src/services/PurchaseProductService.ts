const API_URL = import.meta.env.VITE_HUB_BASE_URL
const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN

export interface PurchaseRequest {
  workspace: string | undefined
  datasetUrl: string
  provider: 'airbus_optical' | 'airbus_sar' | 'planet'
  productBundle: string
  coordinates?: number[][][]
  parameters?: Record<string, unknown>
  country?: string
}

export const purchaseProduct = async ({
  workspace,
  datasetUrl,
  provider,
  productBundle,
  coordinates,
  parameters,
  country,
}: PurchaseRequest): Promise<unknown> => {
  if (!workspace) {
    throw new Error('Workspace is required for placing an order.')
  }

  const purchaseApiUrl = `${API_URL}/api/catalogue/manage/catalogs/user-datasets/${workspace}/commercial-data`

  const requestBody: Record<string, unknown> = {
    url: datasetUrl,
    product_bundle: productBundle,
  }

  // Only add coordinates if applicable (Airbus Optical & Planet)
  if ((provider === 'airbus_optical' || provider === 'planet') && coordinates) {
    requestBody.coordinates = coordinates
  }

  // Only add country if applicable (Airbus Optical & Airbus sSar)
  if ((provider === 'airbus_optical' || provider === 'airbus_sar') && country) {
    requestBody.country = country
  }

  // Always include parameters if provided (Airbus SAR & Optical)
  if (parameters && Object.keys(parameters).length > 0) {
    requestBody.parameters = parameters
  }

  try {
    const response = await fetch(purchaseApiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()

    return { success: true, data: responseData }
  } catch (error) {
    throw new Error('Failed to complete the order request.')
  }
}
