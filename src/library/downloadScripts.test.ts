import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Collection } from '@/types'
import {
  assetFilenames,
  buildBashScript,
  buildPowerShellScript,
  buildPythonScript,
  getCatalogPath,
  getScriptHubBaseUrl,
  isEodhHost,
  TOKEN_PLACEHOLDER,
  type DownloadScriptParams,
} from './downloadScripts'

// setupTests.ts stubs URL for object URLs; these helpers need the real one.
beforeAll(() => {
  vi.unstubAllGlobals()
})

const publicParams = (overrides: Partial<DownloadScriptParams> = {}): DownloadScriptParams => ({
  assets: [
    { key: 'B04', href: 'https://dap.ceda.ac.uk/data/S2/B04.tif' },
    { key: 'thumbnail', href: 'https://dap.ceda.ac.uk/data/S2/thumb.png' },
  ],
  allSelected: true,
  itemId: 'S2A_20250601',
  collectionId: 'sentinel2_ard',
  catalogPath: 'supported-datasets/catalogs/ceda-stac-catalogue',
  itemSelfHref: 'https://eodatahub.org.uk/api/catalogue/stac/items/S2A_20250601',
  isPrivate: false,
  hubBaseUrl: 'https://eodatahub.org.uk',
  ...overrides,
})

const privateParams = (overrides: Partial<DownloadScriptParams> = {}) =>
  publicParams({
    assets: [
      {
        key: 'HH',
        href: 'https://my-ws.eodatahub-workspaces.org.uk/files/commercial-data/HH.tif',
      },
      { key: 'quicklook', href: 'https://third-party.example.com/quicklook.png' },
    ],
    catalogPath: 'user/catalogs/my-ws/catalogs/commercial-data',
    collectionId: 'airbus_sar_data',
    isPrivate: true,
    workspace: 'my-ws',
    ...overrides,
  })

describe('isEodhHost', () => {
  it('accepts DataHub and workspace hosts', () => {
    expect(isEodhHost('https://eodatahub.org.uk/api')).toBe(true)
    expect(isEodhHost('https://staging.eodatahub.org.uk/api')).toBe(true)
    expect(isEodhHost('https://ws.eodatahub-workspaces.org.uk/files/x')).toBe(true)
  })

  it('rejects other hosts, including look-alikes', () => {
    expect(isEodhHost('https://dap.ceda.ac.uk/x')).toBe(false)
    expect(isEodhHost('https://evileodatahub.org.uk/x')).toBe(false)
    expect(isEodhHost('not a url')).toBe(false)
  })

  it('accepts the configured hub host', () => {
    expect(isEodhHost('https://hub.dev.example/x', 'https://hub.dev.example')).toBe(true)
  })
})

describe('assetFilenames', () => {
  it('uses the basename, falls back to the key, and prefixes the key on collisions', () => {
    const names = assetFilenames([
      { key: 'a', href: 'https://x.example/one/data.tif' },
      { key: 'b', href: 'https://x.example/two/data.tif' },
      { key: 'c', href: 'https://x.example/' },
      { key: 'd', href: 'https://x.example/my%20file.tif?sig=1' },
    ])
    expect(names.get('a')).toBe('data.tif')
    expect(names.get('b')).toBe('b_data.tif')
    expect(names.get('c')).toBe('c')
    expect(names.get('d')).toBe('my_file.tif')
  })
})

describe('assetFilenames case', () => {
  it('treats names that differ only in case as the same file', () => {
    const names = assetFilenames([
      { key: 'upper', href: 'https://x.example/B04.TIF' },
      { key: 'lower', href: 'https://x.example/b04.tif' },
    ])
    expect(names.get('upper')).toBe('B04.TIF')
    expect(names.get('lower')).toBe('lower_b04.tif')
  })

  it('matches the case-insensitive check in the Python script', () => {
    const script = buildPythonScript(publicParams())
    expect(script).toContain('    if name.lower() in used:')
    expect(script).toContain('    used.add(name.lower())')
  })
})

describe('getCatalogPath', () => {
  it('extracts the catalog path from the collection self link', () => {
    const collection = {
      id: 'sentinel2_ard',
      links: [
        {
          rel: 'self',
          href: 'https://eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/catalogs/ceda-stac-catalogue/collections/sentinel2_ard',
        },
      ],
    } as Collection
    expect(getCatalogPath(collection)).toBe('supported-datasets/catalogs/ceda-stac-catalogue')
  })

  it('returns undefined when the self link has another shape', () => {
    const collection = {
      id: 'x',
      links: [{ rel: 'self', href: 'https://other.example/collections/x' }],
    } as Collection
    expect(getCatalogPath(collection)).toBeUndefined()
  })
})

describe('buildBashScript', () => {
  it('has no token for public items', () => {
    const script = buildBashScript(publicParams())
    expect(script).not.toContain('EODH_TOKEN')
    expect(script).toContain("download 'B04.tif' 'https://dap.ceda.ac.uk/data/S2/B04.tif'\n")
    expect(script).toContain("mkdir -p 'S2A_20250601'")
  })

  it('sends the token only to DataHub hosts for private items', () => {
    const script = buildBashScript(privateParams())
    expect(script).toContain(`EODH_TOKEN='${TOKEN_PLACEHOLDER}'`)
    expect(script).toContain(
      `download 'HH.tif' 'https://my-ws.eodatahub-workspaces.org.uk/files/commercial-data/HH.tif' -H "Authorization: Bearer $EODH_TOKEN"\n`,
    )
    expect(script).toContain(
      "download 'quicklook.png' 'https://third-party.example.com/quicklook.png'\n",
    )
  })

  it('quotes hrefs with quotes, ampersands and spaces', () => {
    const script = buildBashScript(
      publicParams({
        assets: [{ key: 'q', href: "https://x.example/it's a file.tif?a=1&b=2" }],
      }),
    )
    expect(script).toContain(`'https://x.example/it'\\''s a file.tif?a=1&b=2'`)
  })

  it('times out stalled downloads and continues after a failure', () => {
    const script = buildBashScript(publicParams())
    expect(script).toContain('curl -fL --connect-timeout 30 --speed-limit 1 --speed-time 60 "$@"')
    expect(script).toContain('    failed+=("$name")')
    expect(script.trimEnd().endsWith('  exit 1\nfi')).toBe(true)
  })
})

describe('buildPowerShellScript', () => {
  it('has no token for public items', () => {
    const script = buildPowerShellScript(publicParams())
    expect(script).not.toContain('EODH_TOKEN')
    expect(script).not.toContain('$headers')
    expect(script).toContain("  Save-Asset 'https://dap.ceda.ac.uk/data/S2/B04.tif' 'B04.tif'\n")
    expect(script).toContain("$dir = 'S2A_20250601'")
  })

  it('runs as one block when pasted', () => {
    const lines = buildPowerShellScript(publicParams()).trimEnd().split('\n')
    expect(lines).toContain('& {')
    expect(lines.at(-1)).toBe('}')
    expect(lines).toContain("  $ErrorActionPreference = 'Stop'")
    expect(lines).toContain("  $ProgressPreference = 'SilentlyContinue'")
  })

  it('has no blank lines inside the block', () => {
    const lines = buildPowerShellScript(privateParams()).trimEnd().split('\n')
    const block = lines.slice(lines.indexOf('& {'))
    expect(block.every((line) => line.trim() !== '')).toBe(true)
  })

  it('sends the token only to DataHub hosts for private items', () => {
    const script = buildPowerShellScript(privateParams())
    expect(script).toContain(`$EODH_TOKEN = '${TOKEN_PLACEHOLDER}'`)
    expect(script).toContain(
      "  Save-Asset 'https://my-ws.eodatahub-workspaces.org.uk/files/commercial-data/HH.tif' 'HH.tif' $headers\n",
    )
    expect(script).toContain(
      "  Save-Asset 'https://third-party.example.com/quicklook.png' 'quicklook.png'\n",
    )
  })

  it('times out stalled downloads and continues after a failure', () => {
    const script = buildPowerShellScript(publicParams())
    expect(script).toContain('-TimeoutSec 60')
    expect(script).toContain('    } catch {')
    expect(script).toContain('      $failed.Add($Name)')
    expect(script).toContain('  if ($failed.Count -gt 0) {')
  })

  it('doubles straight and curly single quotes in hrefs', () => {
    const script = buildPowerShellScript(
      publicParams({
        assets: [{ key: 'q', href: "https://x.example/it's it\u2019s $x.tif?a=1&b=2" }],
      }),
    )
    expect(script).toContain("Save-Asset 'https://x.example/it''s it\u2019\u2019s $x.tif?a=1&b=2'")
  })
})

describe('buildPythonScript', () => {
  it('uses a public client and loops over every asset when all are selected', () => {
    const script = buildPythonScript(publicParams())
    expect(script).toContain('client = pyeodh.Client()')
    expect(script).toContain('.get_catalog("supported-datasets/catalogs/ceda-stac-catalogue")')
    expect(script).toContain('.get_collection("sentinel2_ard")')
    expect(script).toContain('.get_item("S2A_20250601")')
    expect(script).toContain('keys = list(item.assets)')
    expect(script).not.toContain('TOKEN')
  })

  it('continues after a failed download and exits with an error at the end', () => {
    const script = buildPythonScript(publicParams())
    expect(script).toContain('timeout=60')
    expect(script).toContain('    except requests.RequestException as e:')
    expect(script).toContain('        failed.append(name)')
    expect(script).toContain('if failed:\n    sys.exit(')
  })

  it('lists the selected keys when only some assets are selected', () => {
    const params = publicParams()
    const script = buildPythonScript({ ...params, assets: [params.assets[0]], allSelected: false })
    expect(script).toContain('keys = ["B04"]')
  })

  it('adds the token, workspace and host check for private items', () => {
    const script = buildPythonScript(privateParams())
    expect(script).toContain(`TOKEN = "${TOKEN_PLACEHOLDER}"`)
    expect(script).toContain('client = pyeodh.Client(username="my-ws", token=TOKEN)')
    expect(script).toContain('EODH_HOSTS = ("eodatahub.org.uk", "eodatahub-workspaces.org.uk")')
    expect(script).toContain('headers=headers_for(asset.href)')
  })

  it('sets base_url for non-production hubs only', () => {
    expect(
      buildPythonScript(publicParams({ hubBaseUrl: 'https://staging.eodatahub.org.uk/' })),
    ).toContain('client = pyeodh.Client(base_url="https://staging.eodatahub.org.uk")')
    expect(buildPythonScript(publicParams())).not.toContain('base_url')
  })

  it('falls back to Item.from_href when there is no catalog path', () => {
    const script = buildPythonScript(publicParams({ catalogPath: undefined }))
    expect(script).toContain('from pyeodh.resource_catalog import Item')
    expect(script).toContain(
      'item = Item.from_href(client, "https://eodatahub.org.uk/api/catalogue/stac/items/S2A_20250601")',
    )
  })

  it('escapes quotes in ids', () => {
    const script = buildPythonScript(publicParams({ itemId: 'a"b' }))
    expect(script).toContain('.get_item("a\\"b")')
  })
})

describe('script safety and filenames', () => {
  it('keeps item ids with newlines inside the comment line', () => {
    const params = publicParams({ itemId: 'evil\nrm -rf ~\r\nmore' })
    for (const script of [
      buildBashScript(params),
      buildPowerShellScript(params),
      buildPythonScript(params),
    ]) {
      expect(script).toContain('# Download assets of STAC item evil rm -rf ~ more\n')
      expect(script.split('\n').some((line) => line.startsWith('rm -rf'))).toBe(false)
    }
  })

  it('cleans Python filenames the same way as the UI', () => {
    const script = buildPythonScript(publicParams())
    expect(script).toContain('return re.sub(r"[^\\w.-]", "_", name, flags=re.ASCII)')
    expect(script).toContain(
      'name = safe_name(posixpath.basename(path.rstrip("/"))) or safe_name(key)',
    )
    expect(script).toContain('for key, asset in item.assets.items():')
  })
})

describe('getScriptHubBaseUrl', () => {
  const withSelf = (href: string) => ({ id: 'c', links: [{ rel: 'self', href }] }) as Collection

  it('uses the hub origin from the collection self link', () => {
    expect(
      getScriptHubBaseUrl(
        withSelf('https://staging.eodatahub.org.uk/api/catalogue/stac/catalogs/x/collections/c'),
        'http://127.0.0.1:5173',
      ),
    ).toBe('https://staging.eodatahub.org.uk')
  })

  it('falls back when the self link is not on a DataHub host', () => {
    expect(
      getScriptHubBaseUrl(
        withSelf('https://other.example/collections/c'),
        'https://eodatahub.org.uk',
      ),
    ).toBe('https://eodatahub.org.uk')
    expect(getScriptHubBaseUrl(undefined, 'https://eodatahub.org.uk')).toBe(
      'https://eodatahub.org.uk',
    )
  })
})

describe('filenames with a partial selection', () => {
  it('uses the names worked out from all assets', () => {
    const all = [
      { key: 'a', href: 'https://x.example/one/data.tif' },
      { key: 'b', href: 'https://x.example/two/data.tif' },
    ]
    const script = buildBashScript(
      publicParams({ assets: [all[1]], allSelected: false, filenames: assetFilenames(all) }),
    )
    expect(script).toContain("download 'b_data.tif' ")
  })
})
