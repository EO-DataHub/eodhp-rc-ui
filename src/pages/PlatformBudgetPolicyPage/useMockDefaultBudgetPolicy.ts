import { useState } from 'react'

export interface DefaultBudgetPolicy {
  negativeBalanceAllowance: string
  computeBudget: string
  warnAtCredits: string
}

const DEFAULT_POLICY: DefaultBudgetPolicy = {
  negativeBalanceAllowance: '50',
  computeBudget: '1000',
  warnAtCredits: '200',
}

const STORAGE_KEY = 'mockPlatformDefaultBudgetPolicy'

const readStored = (): DefaultBudgetPolicy => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_POLICY, ...(JSON.parse(raw) as DefaultBudgetPolicy) }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_POLICY
}

/**
 * UI preview only — no platform-wide budget-policy API exists yet. Per BR-GOV-01, new
 * workspaces are meant to inherit these defaults until a workspace admin sets their own
 * override on the Budget page; that inheritance isn't wired up yet, this just persists the
 * hub_admin-set defaults themselves.
 */
export const useMockDefaultBudgetPolicy = () => {
  const [policy, setPolicyState] = useState<DefaultBudgetPolicy>(readStored)

  const savePolicy = (next: DefaultBudgetPolicy) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setPolicyState(next)
  }

  return { policy, savePolicy }
}
