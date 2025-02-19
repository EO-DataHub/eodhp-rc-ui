/* eslint-disable @typescript-eslint/no-explicit-any */
// const API_URL = import.meta.env.VITE_HUB_BASE_URL
const API_URL = 'https://staging.eodatahub.org.uk'
const API_TOKEN = import.meta.env.VITE_WORKSPACE_API_TOKEN

export interface PurchaseRequest {
  workspace: string | undefined
  datasetUrl: string
  provider: string
  productBundle?: string
  parameters?: Record<string, any>
}

export const purchaseProduct = async ({
  workspace,
  datasetUrl,
  provider,
  productBundle,
  parameters,
}: PurchaseRequest): Promise<any> => {
  const purchaseApiUrl = `${API_URL}/api/catalogue/manage/catalogs/user-datasets/${workspace}/commercial-data`

  const requestBody: Record<string, any> = { url: datasetUrl }

  if (provider === 'airbus') {
    if (productBundle) {
      requestBody.product_bundle = productBundle // For Optical Data
    } else {
      requestBody.parameters = parameters // For SAR Data
    }
  } else if (provider === 'planet') {
    requestBody.product_bundle = productBundle // Planet always requires a bundle
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
    throw new Error(`${response.statusText}`)
  }
  const responseData = await response.json()

  return { success: true, data: responseData }
}
