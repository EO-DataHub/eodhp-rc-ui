const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL

export interface AccountWorkspace {
  id: string
  name: string
}

export interface Account {
  id: string
  name: string
  status: string
  accountOwner: string
  billingAddress: string
  organizationName: string
  accountOpeningReason: string
  createdAt: string
  workspaces: AccountWorkspace[]
}

export const fetchAccounts = async (token?: string | null): Promise<Account[]> => {
  if (!token) return []
  const response = await fetch(`${HUB_BASE_URL}/api/accounts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`)
  }

  const accounts = await response.json()

  if (!Array.isArray(accounts)) {
    throw new Error('Unexpected response format when fetching accounts.')
  }

  return accounts as Account[]
}

export interface CreateAccountPayload {
  accountOwner: string
  name: string
  billingAddress: string
  organizationName: string
  accountOpeningReason: string
}

export const createAccount = async (
  payload: CreateAccountPayload,
  token: string,
): Promise<Account> => {
  const response = await fetch(`${HUB_BASE_URL}/api/accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to create account: ${response.status} ${response.statusText}`)
  }

  const account = await response.json()

  return account as Account
}
