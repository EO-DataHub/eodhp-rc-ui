import React, { useState } from 'react'
import { Flex, Switch, Badge } from '@radix-ui/themes'

type Visibility = 'public' | 'private'

const readStored = (storageKey: string): Visibility =>
  localStorage.getItem(storageKey) === 'public' ? 'public' : 'private'

/**
 * A visibility toggle with no real backend behind it yet (see the
 * "Redesign the data-publishing flow and APIs" task note) — state is stored
 * in localStorage per storageKey so it looks and feels real for demoing the
 * intended UX, without calling any API.
 */
export const MockVisibilityToggle: React.FC<{ storageKey: string }> = ({ storageKey }) => {
  const [visibility, setVisibility] = useState<Visibility>(() => readStored(storageKey))

  const handleChange = (checked: boolean) => {
    const next: Visibility = checked ? 'public' : 'private'
    localStorage.setItem(storageKey, next)
    setVisibility(next)
  }

  return (
    <Flex align="center" gap="2">
      <Switch checked={visibility === 'public'} onCheckedChange={handleChange} size="1" />
      <Badge color={visibility === 'public' ? 'green' : 'gray'} variant="soft">
        {visibility === 'public' ? 'Public' : 'Private'}
      </Badge>
    </Flex>
  )
}
