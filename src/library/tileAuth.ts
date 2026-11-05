import type { Item } from '@/types'
import type { TokenType } from '@/context/AuthenticatedTileUrlsContext'
import { requiresAuthentication } from './collectionRenderingConfig'

/**
 * Returns the token type that tile requests for this item need, or undefined if they need none.
 *
 * Titiler fetches the STAC item with the token from the tile request, so private items need one.
 * Workflow job outputs are private to their workspace, so they always need the workspace token.
 * Map.tsx sends the current workspace's token, so outputs from another workspace still fail.
 */
export function getItemTileTokenType(item: Item): TokenType | undefined {
  if (item.collectionRef?.isJobCollection) return 'workspace'

  const isUserCollection = item.isUserCollection ?? false
  if (!requiresAuthentication(item.render, isUserCollection)) return undefined
  return isUserCollection ? 'workspace' : 'keycloak'
}
