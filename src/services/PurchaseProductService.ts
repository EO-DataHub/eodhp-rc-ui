/* eslint-disable @typescript-eslint/no-explicit-any */
// const API_URL = import.meta.env.VITE_HUB_BASE_URL
const API_URL = 'https://staging.eodatahub.org.uk'
const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN

export interface PurchaseRequest {
  workspace: string | undefined
  datasetUrl: string
  provider: 'airbus_optical' | 'airbus_sar' | 'planet'
  productBundle: string
  coordinates?: number[][][]
  parameters?: Record<string, any>
}

export const purchaseProduct = async ({
  workspace,
  datasetUrl,
  provider,
  productBundle,
  coordinates,
  parameters,
}: PurchaseRequest): Promise<any> => {
  const purchaseApiUrl = `${API_URL}/api/catalogue/manage/catalogs/user-datasets/${workspace}/commercial-data`

  const requestBody: Record<string, unknown> = {
    url: datasetUrl,
    product_bundle: productBundle,
  }

  //  Airbus Optical supports coordinates
  if (provider === 'airbus_optical' && coordinates) {
    requestBody.coordinates = coordinates
  }

  // Airbus SAR requires `parameters`
  if (provider === 'airbus_sar' && parameters) {
    requestBody.parameters = parameters
  }

  const response = await fetch(purchaseApiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`Order request failed: ${response.status} ${response.statusText}`)
  }

  const responseData = await response.json()
  return { success: true, data: responseData }
}
