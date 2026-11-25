import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Theme } from '@radix-ui/themes'
import type { Collection } from '@/types'
import { stubBrowserGlobals } from '@/test-data/runWorkflow'
import { SidePanelCollectionCard } from './SidePanelCollectionCard'

const landsat = {
  id: 'landsat_c2l2',
  title: 'Landsat C2 L2',
  displayedTitle: 'Landsat C2 L2',
  description: '',
  links: [],
  extent: { temporal: { interval: [['2020-01-01T00:00:00Z', '2021-06-30T00:00:00Z']] } },
} as unknown as Collection

const landsatWithQA = {
  ...landsat,
  assets: { qa_documentation: { href: 'https://hub.example/qa.pdf' } },
} as unknown as Collection

const renderCard = (collection: Collection = landsat) => {
  const props = {
    onChangeCollection: vi.fn(),
    onSelectCollectionInfo: vi.fn(),
    onSelectCollectionQA: vi.fn(),
  }
  const { container } = render(
    <Theme>
      <SidePanelCollectionCard collection={collection} {...props} />
    </Theme>,
  )
  return { ...props, container, user: userEvent.setup() }
}

describe('Click anywhere on a dataset card', () => {
  beforeEach(stubBrowserGlobals)
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('has a button named after the dataset that opens it, and no Open Collection link', async () => {
    const { user, onChangeCollection } = renderCard()

    expect(screen.queryByRole('link', { name: /open collection/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /open collection/i })).toBeNull()
    expect(screen.queryByText(/open collection/i)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Open Landsat C2 L2' }))
    expect(onChangeCollection).toHaveBeenCalledTimes(1)
  })

  it('opens the dataset when the thumbnail or the date is clicked', async () => {
    const { user, container, onChangeCollection } = renderCard()

    await user.click(container.querySelector('img')!)
    expect(onChangeCollection).toHaveBeenCalledTimes(1)

    await user.click(screen.getByText('01/01/2020 - 30/06/2021'))
    expect(onChangeCollection).toHaveBeenCalledTimes(2)
  })

  it('opens the metadata from View Collection Metadata without opening the dataset', async () => {
    const { user, onChangeCollection, onSelectCollectionInfo } = renderCard()

    await user.click(screen.getByRole('button', { name: /view collection metadata/i }))
    expect(onSelectCollectionInfo).toHaveBeenCalledTimes(1)
    expect(onChangeCollection).not.toHaveBeenCalled()
  })

  it('opens the quality assessment from QA without opening the dataset', async () => {
    const { user, onChangeCollection, onSelectCollectionQA } = renderCard(landsatWithQA)

    await user.click(screen.getByRole('button', { name: /view quality assessment/i }))
    expect(onSelectCollectionQA).toHaveBeenCalledTimes(1)
    expect(onChangeCollection).not.toHaveBeenCalled()
  })

  it('can be reached with Tab and opened with Enter', async () => {
    const { user, onChangeCollection } = renderCard()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Open Landsat C2 L2' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onChangeCollection).toHaveBeenCalledTimes(1)
  })
})
