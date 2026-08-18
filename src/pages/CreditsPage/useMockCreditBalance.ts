import { useState } from 'react'

const INITIAL_BALANCE = 1200

let sharedBalance = INITIAL_BALANCE

/**
 * UI preview only — mirrors useState, but backs onto a module-level value so the Credits
 * and Budget pages (mounted one at a time, never together) show the same balance instead
 * of each tracking its own disconnected copy. Resets on page refresh like the rest of the
 * accounting mocks.
 */
export const useMockCreditBalance = () => {
  const [balance, setBalanceState] = useState(sharedBalance)

  const setBalance = (update: number | ((prev: number) => number)) => {
    setBalanceState((prev) => {
      const next =
        typeof update === 'function' ? (update as (prev: number) => number)(prev) : update
      sharedBalance = next
      return next
    })
  }

  return [balance, setBalance] as const
}
