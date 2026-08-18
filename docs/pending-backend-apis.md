# Pending backend APIs: roles, ownership, visibility & accounting

The Members, Publisher, Files, Profile, and Accounting/Billing pages currently mock several
controls purely client-side (`localStorage` or in-memory React state, no server calls)
because the real APIs don't exist yet. This doc lists what would need to be built for those
controls to become real. Grouped by page.

## Members page (`src/pages/MembersPage`)

Today's real endpoints (`workspaceMembersService.ts`):

- `GET /api/workspaces/:id/users` — list members
- `PUT /api/workspaces/:id/users/:username` — add member
- `DELETE /api/workspaces/:id/users/:username` — remove member

Mocked in `useMockWorkspaceRoles.ts`: an `owner` and a set of `admins` per workspace,
stored in `localStorage`. To make this real:

1. **Read roles** — extend `GET /api/workspaces/:id/users` so each member includes a
   role (`owner` / `admin` / `member`), or add a dedicated
   `GET /api/workspaces/:id/roles` returning `{ owner, admins: [] }`. Recommend extending
   the existing members response — the UI always needs both together in the same table
   render, so a second endpoint just adds a round trip.
2. **Promote to admin** — `PUT /api/workspaces/:id/admins/:username`, mirroring the
   existing add-member pattern.
3. **Demote from admin** — `DELETE /api/workspaces/:id/admins/:username`.
4. **Transfer ownership** — `POST /api/workspaces/:id/owner/transfer` with body
   `{ newOwner: username }`. Must atomically set the new owner _and_ move the previous
   owner into `admins` (the mock demotes the outgoing owner to admin, not all the way to
   member).
5. **Authorization gaps the mock doesn't enforce**:
   - `DELETE /api/workspaces/:id/users/:username` must reject removing the current owner
     (403). The mock only disables the button client-side.
   - The promote/demote/transfer endpoints need their own authorization rule. Today only
     the single account-scoped `account_owner` can call add/remove-member endpoints
     (`mustBeAccountOwner`). The mock's role `Select` and "Transfer ownership" button have
     **no permission check at all** — any signed-in member sees them. Whether only the
     owner can promote/demote admins, or any admin can, is still an open question (see
     the "Implement multi-admin permission-model" task note) — not resolved here.

Backing data model (recommended there): a new `workspace_admins` table (`workspace_id`,
`username`, `added_by`, `created_at`) plus a nullable `owner` column, replacing/extending
today's single account-scoped `account_owner` column.

## Workspace category (`src/pages/MembersPage`, badge also shown on Credits)

Per the credits-ledger design docs: every workspace has a category (`commercial` /
`research`) that feeds into its pricing multiplier, settable only by a `hub_admin`
(platform-wide realm role) via the workspace-management system. Two different things are
mocked here, at two different levels of realism:

1. **Permission check is real, not mocked.** `AuthenticationContext.isHubAdmin` is read
   straight from the already-decoded Keycloak access token
   (`tokenParsed.realm_access.roles.includes('hub_admin')`, computed in
   `AuthenticationProvider.tsx`) — no backend call needed, and nothing here needs to change
   once a real category API exists. The edit `Select` on the Members page only renders for
   users who actually hold the `hub_admin` realm role today.
2. **The category value itself is mocked** — `useMockWorkspaceCategory.ts` stores it in
   `localStorage` per workspace, defaulting new/unseen workspaces to `commercial` (mirroring
   "new workspaces default to a category until a hub admin manually classifies them"). To
   make this real:
   - **Read category** — e.g. `GET /api/workspaces/:id` returning a `category` field, or a
     dedicated `GET /api/workspaces/:id/category`.
   - **Write category** — `PUT /api/workspaces/:id/category` with body
     `{ category: 'commercial' | 'research' }`, gated server-side on the caller holding the
     `hub_admin` realm role (the frontend's role check is real, but nothing stops a direct
     API call bypassing it — same caveat as every other client-side-only gate in this doc).
   - Per the schema doc, this table deliberately keeps no history — the _ledger_ rows record
     which category applied at charge-time, so recategorizing a workspace doesn't need to
     rewrite past charges.

## Workspace integrations — Dask, GPU (`src/pages/MembersPage`)

Same shape as workspace category directly above, and shown right next to it: two
per-workspace on/off flags (`daskEnabled`, `gpuEnabled`), settable only by a `hub_admin`,
using the same real `isHubAdmin` permission check. `useMockWorkspaceIntegrations.ts` stores
both flags in `localStorage` per workspace, both defaulting to disabled. To make this real:

- **Read integrations** — e.g. extend `GET /api/workspaces/:id` with `dask_enabled` /
  `gpu_enabled` booleans, or a dedicated `GET /api/workspaces/:id/integrations`.
- **Write integrations** — `PUT /api/workspaces/:id/integrations` with body
  `{ dask_enabled?: boolean, gpu_enabled?: boolean }`, gated server-side on `hub_admin` —
  same bypass caveat as workspace category: the frontend gate is real, but a direct API
  call isn't stopped by anything client-side.
- Unlike category, enabling either of these presumably has to actually provision
  something (spin up a Dask scheduler, attach GPU-backed compute) rather than just flip a
  billing-relevant flag — the real endpoint is likely not a simple database write, but
  that's an infrastructure question outside this doc's scope.

## Platform admin usage (`src/pages/PlatformAdminUsagePage`)

A cross-workspace "which workspaces are using the most" leaderboard, gated on `isHubAdmin`
(same real permission check as workspace category above — a hub_admin sees a "Platform
admin" entry in the avatar menu, everyone else doesn't, and the route itself renders an
access-denied `Callout` if hit directly without the role). Everything else here is mocked:

1. **The workspace list is hardcoded**, not fetched. `fetchWorkspaces` (used everywhere
   else in the app) is caller-scoped — it returns only the signed-in user's own workspaces,
   not every workspace on the platform, so it can't be reused here. Making this real needs a
   new admin-scoped endpoint, e.g. `GET /api/admin/workspaces` returning every workspace
   regardless of the caller's membership, gated server-side on `hub_admin`.
2. **The usage figures are the same illustrative mock data** as the per-workspace Usage
   page, just relabelled by workspace instead of by user — see that page's entry above for
   the underlying usage-ledger API gap. A real version of this page needs whatever that API
   becomes, plus the ability to query/aggregate across workspaces rather than one at a time
   (i.e. it can't just call the per-workspace endpoint once per workspace in a loop at scale).
3. **Category per workspace** reads the same mocked `getMockWorkspaceCategory` as above —
   once workspace category is real, this column falls out for free.

## Profile page (`src/pages/ProfilePage`)

Account details and identity-provider linking both deep-link out to Keycloak's own Account
Console (`{KEYCLOAK_URL}/realms/{REALM}/account` and its `account-security/linked-accounts`
sub-page) — these already work for real today, since Keycloak natively handles both. No new
API needed for either.

Account deletion is fully mocked — there's no account-deletion endpoint at all, and deleting
is blocked client-side by checking `getMockWorkspaceOwner` (the same per-workspace mock role
data the Members page writes to `localStorage`) against every workspace the user belongs to
(`fetchWorkspaces`). To make this real:

1. **Delete account** — an endpoint (Keycloak itself, or a wrapper in front of it) that
   actually deletes the user's account.
2. **Block on workspace ownership, server-side** — the mock's ownership check only catches
   workspaces whose Members page has actually been visited in this browser (no stored data =
   treated as not-owned). The real endpoint needs to reject deletion (403/409, with the list
   of workspaces that need a transfer first) if the caller is the current owner of any
   workspace. This can't be a client-side-only check — Keycloak's own account-deletion API
   has no concept of workspace ownership and could be called directly, bypassing whatever the
   frontend enforces.

## Publisher page (`src/pages/PublisherPage`, Catalogue + Workflows tabs)

Today's real endpoints:

- `GET .../catalogs/user/catalogs/{workspace}/catalogs` — list workspace catalogs
- `GET .../catalogs/{catalog}/collections` — list collections
- `GET .../catalogs/user/catalogs/{workspace}/processes` — list workflows
- `POST /workspaces/:id/harvest_logs` — harvest logs

Mocked in `MockVisibilitySelect.tsx`: a public/private flag per collection and per
workflow, stored in `localStorage` keyed by workspace + item id, surfaced as a dropdown
that requires confirmation before a change takes effect. To make this real:

1. **Read visibility per collection** — none of the endpoints above return a
   visibility/access field today. The collections list (or a dedicated endpoint) needs a
   `visibility` field per collection.
2. **Write visibility per collection** — e.g. `PUT .../collections/{id}/visibility` with
   body `{ visibility: 'public' | 'private' }`. This is the direct implementation of
   Option B ("visibility as a resource property") from the publishing-flow redesign below.
3. **Read visibility per workflow** — same gap on the processes list.
4. **Write visibility per workflow** — a `PUT .../processes/{id}/visibility` equivalent.
5. **Authorization** — same as Members above: the mock has no permission check on who can
   change visibility. Real endpoints presumably need the same admin/owner gating.
6. **Confirmation step is frontend-only** — the mock's "are you sure?" prompt before
   applying a change is a UX safeguard, not something the API needs to model. The only
   API-relevant implication is that a visibility write should be safe to retry/idempotent,
   since a slow confirm click could plausibly double-submit.

Visibility model is deliberately binary (`public`/`private`) everywhere it's mocked —
Catalogue, Workflows, and Files (below) all use the same two-tier model, so there's
no model choice left open here.

## Files page (`src/pages/DataStoragePage`, labelled "Files" in the UI)

Today's real endpoints (`workspaceFilesService.ts`):

- `GET /api/workspaces/:id/files` — list files
- `PUT`/presigned-URL upload endpoints — upload files
- `DELETE .../files/:storeType/:fileName` — delete a file

Mocked in the same `MockVisibilitySelect.tsx` component as above: each file row gets its
own public/private dropdown (with the same confirm-before-apply step), stored in
`localStorage` keyed by workspace + store type + file name. To make this real:

1. **Read visibility per file** — the files list needs a `visibility` field per file.
2. **Write visibility per file** — e.g. `PUT .../files/:storeType/:fileName/visibility`
   with body `{ visibility: 'public' | 'private' }`.
3. **Authorization** — same admin/owner gating question as above.

This used to be prototyped as a multi-step "Publish selected" wizard (`PublishModal.tsx`,
Option E from the redesign note below) batching several files through collection-picking,
metadata upload, and a three-tier visibility picker. That wizard has been removed in favour
of the plain per-file dropdown described above — deliberately no batch flow, no modal, no
metadata/catalogue step. See the note below for what that leaves unresolved.

## Accounting / Billing — per-user usage & budgets (`UsagePage`, `BudgetPage`)

Both pages are still fully illustrative (in-memory React state that resets on refresh — no
persistence at all, mock or otherwise, unlike the `localStorage`-backed mocks above).
Recently extended toward per-user granularity:

- **Usage page** — each mock usage record now has a `user` field; a "User" filter `Select`
  sits alongside the existing month filter, and a "Usage by user" breakdown table above the
  main table always shows every user's total for the selected month, independent of the user
  filter. To make this real: the usage-ledger endpoint (doesn't exist yet — see the existing
  "No usage API exists yet" note in the page itself) needs a `user` field per record, and
  ideally a server-side per-user aggregate so the by-user breakdown doesn't require fetching
  and summing every raw record client-side.
- **Budget page** — a new "Per-user budgets" toggle (off by default, so workspaces with no
  need for it never see the section) reveals a default per-user compute threshold plus an
  "Overrides" list: most members share the default; specific members can get a custom
  threshold via a dialog backed by the real `fetchWorkspaceMembers`. Per-user budgets
  supplement, not replace, the existing workspace-wide threshold — whichever is hit first
  blocks activity. To make this real:
  1. **Read/write the default per-user threshold** for a workspace, plus whether the
     per-user-budgets feature is enabled at all.
  2. **Read/write per-user overrides** — effectively a small table of
     `{ workspace, username, threshold, alertsEnabled }`.
  3. **Authorization** — same open question as Members/Publisher above: who can set these,
     the owner only or any admin?

## Publishing-flow redesign (see "Redesign the data-publishing flow and APIs" task note)

The task note's background: today's real publish flow is three disconnected manual
phases (upload STAC Item → separately upload data + hand-edit asset hrefs → hand-write a
freeform access-policy JSON). Its recommendation was **B + A**, with E as the resulting UI:

- **Option B — visibility as a resource property** is now the one actually built (as the
  binary dropdown described above, across Catalogue, Workflows, and Files).
- **Option A — combined upload endpoint** is not currently demonstrated by anything in the
  UI (the `PublishModal` prototype that stood in for it was removed — see above). It's
  still the recommended direction for the "hand-constructed asset href" problem, just not
  reflected in this doc's API list since nothing mocked today depends on it. If/when that
  flow gets rebuilt: one endpoint accepting a STAC Item JSON plus data file references
  together, with the server deriving the storage path and filling in `assets[*].href`
  itself. For large files, reuse the existing presigned-URL pattern
  (`workspaceFilesService.uploadObjectStoreFilePresigned`) rather than streaming binaries
  through the API.
- **Deliberately not recommended:** Option C (one orchestrating publish job across
  `workspace-file-harvester`, `stac-validator`, and the catalogue API) — real
  cross-service orchestration, more investment than this low-usage admin feature
  currently justifies. Option D (make today's three phases fail loudly instead of
  silently no-op'ing) is cheap and worth doing regardless, but doesn't reduce step count
  and isn't blocking anything mocked so far.

---

**Also worth noting, not detailed here:** several backend services have CORS
misconfigured for the RC UI's origin (`auth-agent-tokens`, `stac-validator`,
`workspace-file-harvester`) — an ingress config fix, not an API shape change, but it
blocks calling several of the above from a browser in production regardless of API
design. See the "Migrate eodhp-workspace-ui functionality into eodhp-rc-ui" task note for
details.
