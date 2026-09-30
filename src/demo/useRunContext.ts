import { useContext } from 'react'
import { useSelector } from '@xstate/store/react'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import type { Item } from '@/types'
import demoStore from './demoStore'
import { DEMO_WORKSPACE } from './mockData'

export interface RunContext {
  item?: Item
  pinnedItems: Item[]
  /** Result ids of the current search, or undefined outside the Data Finder. */
  resultIds?: string[]
  resultsTotal: number
  collectionId?: string
  collectionTitle?: string
  hasAoi: boolean
  workspace: string
}

/** Everything the Run workflow dialog needs from the Data Finder. */
export const useRunContext = ({ inFinder }: { inFinder: boolean }): RunContext => {
  const { currentWorkspace } = useContext(AuthenticationContext)
  const pinnedItems = useSelector(dataFinderStore, ({ context }) => context.pinnedItems)
  const infoPanelItem = useSelector(dataFinderStore, ({ context }) => context.infoPanelItem)
  const collection = useSelector(dataFinderStore, ({ context }) => context.collection)
  const aoi = useSelector(dataFinderStore, ({ context }) => context.aoi)
  const resultIds = useSelector(demoStore, ({ context }) => context.resultIds)
  const resultsTotal = useSelector(demoStore, ({ context }) => context.resultsTotal)

  return {
    item: inFinder ? infoPanelItem : undefined,
    pinnedItems,
    resultIds: inFinder ? resultIds : undefined,
    resultsTotal: inFinder ? resultsTotal : 0,
    collectionId: inFinder ? collection?.id : undefined,
    collectionTitle: inFinder ? collection?.title ?? collection?.id : undefined,
    hasAoi: inFinder && !!aoi,
    workspace: currentWorkspace ?? DEMO_WORKSPACE,
  }
}
