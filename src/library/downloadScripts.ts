import type { Collection } from '@/types'

export const TOKEN_PLACEHOLDER = '<YOUR_API_TOKEN>'

const PROD_HUB_BASE_URL = 'https://eodatahub.org.uk'
const EODH_DOMAINS = ['eodatahub.org.uk', 'eodatahub-workspaces.org.uk']

export interface ScriptAsset {
  key: string
  href: string
}

export interface DownloadScriptParams {
  /** Assets to download, already filtered to the user's selection. */
  assets: ScriptAsset[]
  /** True when every asset of the item is selected. */
  allSelected: boolean
  itemId: string
  collectionId: string
  /** Catalog path relative to /catalogs/, as pyeodh's get_catalog expects. */
  catalogPath?: string
  itemSelfHref?: string
  isPrivate: boolean
  workspace?: string
  hubBaseUrl?: string
  /** Names for all of the item's assets (from assetFilenames), so a partial selection keeps the names shown in the UI. */
  filenames?: Map<string, string>
}

const hostnameOf = (href: string): string => {
  try {
    return new URL(href).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** Hosts a DataHub API token may be sent to. */
const eodhHosts = (hubBaseUrl?: string): string[] => {
  const hubHost = hubBaseUrl ? hostnameOf(hubBaseUrl) : ''
  return hubHost && !EODH_DOMAINS.includes(hubHost) ? [...EODH_DOMAINS, hubHost] : EODH_DOMAINS
}

export const isEodhHost = (href: string, hubBaseUrl?: string): boolean => {
  const host = hostnameOf(href)
  if (!host) return false
  return eodhHosts(hubBaseUrl).some((domain) => host === domain || host.endsWith(`.${domain}`))
}

const safeName = (name: string): string => name.replace(/[^\w.-]/g, '_')

const basenameOf = (href: string): string => {
  let path: string
  try {
    path = new URL(href).pathname
  } catch {
    path = href.split(/[?#]/)[0]
  }
  const last = path.split('/').filter(Boolean).pop() ?? ''
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

/**
 * Picks a local filename for each asset: the href's basename, or the asset key when
 * there is none. When two assets share a name, the later one is prefixed with its key.
 */
export const assetFilenames = (assets: ScriptAsset[]): Map<string, string> => {
  const names = new Map<string, string>()
  const used = new Set<string>()
  for (const { key, href } of assets) {
    let name = safeName(basenameOf(href)) || safeName(key)
    if (used.has(name)) {
      name = safeName(`${key}_${name}`)
    }
    used.add(name)
    names.set(key, name)
  }
  return names
}

/** Catalog path for pyeodh, from a collection self link such as ".../stac/catalogs/<path>/collections/<id>". */
export const getCatalogPath = (collection?: Collection | null): string | undefined => {
  const selfHref = collection?.links?.find((link) => link.rel === 'self')?.href
  const match = selfHref?.match(/\/catalogue\/stac\/catalogs\/(.+)\/collections\/[^/]+\/?$/)
  return match?.[1]
}

/**
 * Hub URL for the scripts, from the collection's self link. The app's own hub URL can be a
 * local dev proxy, which pyeodh can't use, but the self link always points at the real hub.
 */
export const getScriptHubBaseUrl = (
  collection?: Collection | null,
  fallback?: string,
): string | undefined => {
  const selfHref = collection?.links?.find((link) => link.rel === 'self')?.href
  if (selfHref && isEodhHost(selfHref)) {
    try {
      return new URL(selfHref).origin
    } catch {
      // fall through to the fallback
    }
  }
  return fallback
}

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`

const pyString = (value: string): string => JSON.stringify(value)

const outputDirName = (itemId: string): string => safeName(itemId) || 'downloads'

// Keeps ids from breaking out of a "#" comment line in the generated scripts
const commentText = (text: string): string => text.replace(/[\r\n\u2028\u2029]+/g, ' ')

export const buildBashScript = ({
  assets,
  itemId,
  isPrivate,
  hubBaseUrl,
  filenames = assetFilenames(assets),
}: DownloadScriptParams): string => {
  const lines = [
    '#!/usr/bin/env bash',
    `# Download assets of STAC item ${commentText(itemId)}`,
    'set -euo pipefail',
    '',
  ]

  if (isPrivate) {
    lines.push(`EODH_TOKEN=${shellQuote(TOKEN_PLACEHOLDER)}`, '')
  }

  const dir = shellQuote(outputDirName(itemId))
  lines.push(`mkdir -p ${dir}`, `cd ${dir}`, '')

  for (const { key, href } of assets) {
    const auth =
      isPrivate && isEodhHost(href, hubBaseUrl) ? ' -H "Authorization: Bearer $EODH_TOKEN"' : ''
    lines.push(`curl -fL${auth} -o ${shellQuote(filenames.get(key)!)} ${shellQuote(href)}`)
  }

  return `${lines.join('\n')}\n`
}

export const buildPythonScript = ({
  assets,
  allSelected,
  itemId,
  collectionId,
  catalogPath,
  itemSelfHref,
  isPrivate,
  workspace,
  hubBaseUrl,
}: DownloadScriptParams): string => {
  const baseUrl = hubBaseUrl?.replace(/\/$/, '')
  const clientArgs: string[] = []
  if (baseUrl && baseUrl !== PROD_HUB_BASE_URL) clientArgs.push(`base_url=${pyString(baseUrl)}`)
  if (isPrivate) {
    if (workspace) clientArgs.push(`username=${pyString(workspace)}`)
    clientArgs.push('token=TOKEN')
  }

  const lines = [
    `# Download assets of STAC item ${commentText(itemId)}`,
    '# Requires: pip install pyeodh requests',
    'import os',
    'import posixpath',
    'import re',
    'import urllib.parse',
    '',
    'import pyeodh',
    'import requests',
  ]
  if (!catalogPath && itemSelfHref) {
    lines.push('from pyeodh.resource_catalog import Item')
  }
  lines.push('')

  if (isPrivate) {
    lines.push(`TOKEN = ${pyString(TOKEN_PLACEHOLDER)}`, '')
  }

  lines.push(`client = pyeodh.Client(${clientArgs.join(', ')})`, '')

  if (catalogPath) {
    lines.push(
      'item = (',
      '    client.get_catalog_service()',
      `    .get_catalog(${pyString(catalogPath)})`,
      `    .get_collection(${pyString(collectionId)})`,
      `    .get_item(${pyString(itemId)})`,
      ')',
    )
  } else if (itemSelfHref) {
    lines.push(`item = Item.from_href(client, ${pyString(itemSelfHref)})`)
  }
  lines.push('')

  if (isPrivate) {
    const hosts = eodhHosts(baseUrl).map(pyString).join(', ')
    lines.push(
      `EODH_HOSTS = (${hosts})`,
      '',
      '',
      'def headers_for(href):',
      '    # Only send the token to DataHub hosts',
      '    host = urllib.parse.urlparse(href).hostname or ""',
      '    if any(host == h or host.endswith("." + h) for h in EODH_HOSTS):',
      '        return {"Authorization": f"Bearer {TOKEN}"}',
      '    return {}',
      '',
      '',
    )
  }

  if (allSelected) {
    lines.push('keys = list(item.assets)')
  } else {
    lines.push(`keys = [${assets.map(({ key }) => pyString(key)).join(', ')}]`)
  }

  const headersArg = isPrivate ? ', headers=headers_for(asset.href)' : ''
  // Same filename rules as assetFilenames, so files match the names shown in the UI
  lines.push(
    'def safe_name(name):',
    '    return re.sub(r"[^\\w.-]", "_", name, flags=re.ASCII)',
    '',
    '',
    `out_dir = ${pyString(outputDirName(itemId))}`,
    'os.makedirs(out_dir, exist_ok=True)',
    '',
    '# Name every asset first, so names match the page even when only some are downloaded',
    'names = {}',
    'for key, asset in item.assets.items():',
    '    path = urllib.parse.unquote(urllib.parse.urlparse(asset.href).path)',
    '    name = safe_name(posixpath.basename(path.rstrip("/"))) or safe_name(key)',
    '    if name in names.values():',
    '        name = safe_name(f"{key}_{name}")',
    '    names[key] = name',
    '',
    'for key in keys:',
    '    asset = item.assets[key]',
    '    name = names[key]',
    `    with requests.get(asset.href, stream=True, timeout=60${headersArg}) as response:`,
    '        response.raise_for_status()',
    '        with open(os.path.join(out_dir, name), "wb") as f:',
    '            for chunk in response.iter_content(chunk_size=1024 * 1024):',
    '                f.write(chunk)',
    '    print("Downloaded", name)',
  )

  return `${lines.join('\n')}\n`
}
