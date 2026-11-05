import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import { authValue } from '@/test-data/auth'
import { AccountingPage } from './AccountingPage'

const renderSidebar = (isHubAdmin: boolean) =>
  render(
    <Theme>
      <MemoryRouter initialEntries={['/accounting/credits']}>
        <AuthenticationContext.Provider value={authValue({ isHubAdmin })}>
          <Routes>
            <Route path="/accounting" element={<AccountingPage />}>
              <Route path="credits" element={<div>credits page</div>} />
            </Route>
          </Routes>
        </AuthenticationContext.Provider>
      </MemoryRouter>
    </Theme>,
  )

describe('Stage 1: Accounting sidebar All workspaces link', () => {
  it('shows a hub admin an All workspaces link to /accounting/hub', () => {
    renderSidebar(true)
    const nav = screen.getByRole('navigation', { name: 'Accounting' })
    const link = within(nav).getByRole('link', { name: 'All workspaces' })
    expect(link).toHaveAttribute('href', '/accounting/hub')
  })

  it('does not show the link to a user who is not a hub admin', () => {
    renderSidebar(false)
    const nav = screen.getByRole('navigation', { name: 'Accounting' })
    expect(within(nav).getByRole('link', { name: 'Usage' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'All workspaces' })).not.toBeInTheDocument()
  })

  it('does not list the drill-down route as a sidebar link', () => {
    renderSidebar(true)
    const nav = screen.getByRole('navigation', { name: 'Accounting' })
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    expect(hrefs.filter((href) => href?.startsWith('/accounting/hub'))).toEqual(['/accounting/hub'])
  })
})
