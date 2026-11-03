import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { authValue } from '@/test-data/auth'
import { stubRadixBrowserApis } from '@/test-data/hubUsage'
import { LoginButton } from './LoginButton'

const renderMenu = (isHubAdmin: boolean) =>
  render(
    <Theme>
      <MemoryRouter>
        <AuthenticationContext.Provider value={authValue({ isHubAdmin })}>
          <LoginButton isUserMenuOpen setIsUserMenuOpen={vi.fn()} />
        </AuthenticationContext.Provider>
      </MemoryRouter>
    </Theme>,
  )

// Opens each submenu in turn and collects every menu item seen, with its link target.
const allMenuItems = () => {
  const seen = new Map<string, string | null>()
  const collect = () =>
    screen.queryAllByRole('menuitem').forEach((item) => {
      seen.set(item.textContent?.trim() ?? '', item.getAttribute('href'))
    })
  collect()
  const triggers = screen
    .getAllByRole('menuitem')
    .filter((item) => item.getAttribute('aria-haspopup') === 'menu')
  triggers.forEach((trigger) => {
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    collect()
  })
  return seen
}

beforeAll(() => {
  stubRadixBrowserApis()
})

describe('Stage 1: header user menu All workspaces link', () => {
  it('shows a hub admin an All workspaces link to /accounting/hub', () => {
    renderMenu(true)
    const items = allMenuItems()
    expect(items.has('All workspaces')).toBe(true)
    expect(items.get('All workspaces')).toBe('/accounting/hub')
  })

  it('does not show the link to a user who is not a hub admin', () => {
    renderMenu(false)
    const items = allMenuItems()
    expect(items.has('Usage')).toBe(true)
    expect(items.has('All workspaces')).toBe(false)
  })
})
