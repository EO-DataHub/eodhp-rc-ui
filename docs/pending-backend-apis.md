# Pending backend APIs: roles, ownership, visibility & accounting

The Members, Publisher, Files, Profile, Accounting/Billing, and Platform admin usage pages currently mock several controls purely client-side (`localStorage` or in-memory React state, no server calls) because the real APIs don't exist yet. This doc lists what would need to be built for those controls to become real. Grouped by page.

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

Per the credits-ledger design docs: every workspace has a category (`commercial` / `research`) that feeds into its pricing multiplier, settable only by a `hub_admin` (platform-wide realm role) via the workspace-management system. Two different things are mocked here, at two different levels of realism:

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

Same shape as workspace category directly above, and shown right next to it: two per-workspace on/off flags (`daskEnabled`, `gpuEnabled`), settable only by a `hub_admin`, using the same real `isHubAdmin` permission check. `useMockWorkspaceIntegrations.ts` stores both flags in `localStorage` per workspace, both defaulting to disabled. To make this real:

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

## Provider accounts page (`src/pages/ProviderAccountsPage`)

Ported from `eodhp-workspace-ui`'s "Linked accounts" page — workspace-scoped (owner edits,
everyone else views read-only), for linking commercial data-provider accounts so a workspace
can order their imagery. Two different mechanisms, both already real, not mocked:

- **Airbus / Planet** — a simple API-key link. Existing endpoints (`linkedAccountsService.ts`),
  confirmed live in `eodhp-workspace-services` (`cmd/serve.go` route registration,
  `api/services/linked-accounts.go`): `GET/POST /api/workspaces/:id/linked-accounts`,
  `DELETE /api/workspaces/:id/linked-accounts/:provider`, and
  `POST /api/workspaces/:id/linked-accounts/:provider/validate`. Now called with a Keycloak
  bearer token instead of the old app's cookie/gateway session — otherwise unchanged. (Keys are
  stored one-time-pad-encrypted, split between a Kubernetes secret and AWS Secrets Manager —
  not relevant to the frontend, but explains why there's no plain "get the stored key back"
  endpoint.)
- **Open Cosmos** — a bespoke OAuth2/PKCE flow against Open Cosmos's own login domain, entirely
  separate from Keycloak. Ported with two fixes over the old app: a `state` param is now
  generated and checked on callback (the original had none), and the redirect-back handling
  accounts for this app's hash router (the original app had no router at all).

Two gaps carried over from the old app, **not** fixed by the port above because fixing them
needs new backend work, not just frontend changes. Both confirmed against
`eodhp-workspace-services`' actual route table (not `resource-catalogue-fastapi` — that repo
also touches Open Cosmos, but only to read the stored secret directly from Kubernetes for
order fulfilment; it exposes no HTTP routes for linking):

1. **No read endpoint for the Open Cosmos session.** `POST /api/workspaces/:id/open-cosmos/session`
   is real and live (`CreateOpenCosmosSession`, writes a `oauth-open-cosmos` Kubernetes secret
   in the workspace's namespace) — but there's no matching `GET` anywhere in that service. So
   "Connected" only reflects in-memory state for the current browser tab — reloading the page
   always shows "Not connected," even if a session already exists server-side for that
   workspace. Needs `GET /api/workspaces/:id/open-cosmos/session` (or folding an
   `open_cosmos_linked: boolean` into the existing linked-accounts list) so the page can show
   real status on load.
2. **No revoke endpoint — and the generic one would break.** "Disconnect" only clears local
   state; there's no `DELETE /api/workspaces/:id/open-cosmos/session`. The existing generic
   `DELETE /api/workspaces/:id/linked-accounts/:provider` can't stand in for it either: that
   handler deletes a `otp-{provider}` Kubernetes secret plus an AWS Secrets Manager entry,
   neither of which exists for Open Cosmos (its secret is named `oauth-open-cosmos`, not
   OTP-based) — calling it with `provider=open-cosmos` would 500, not silently no-op. A real
   `DELETE /api/workspaces/:id/open-cosmos/session` needs to be a new, separate endpoint.

Separately, going live also needs: a registered OAuth redirect URI for this app's own domain
(the old app's was `https://eodatahub.org.uk/workspaces/` — this app needs its own, registered
with Open Cosmos), and a real `VITE_OPEN_COSMOS_CLIENT_ID` for this app's build/deploy
pipeline (see `.env.sample`) — neither of which is something this frontend change can supply.

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

## Accounting / Billing — usage, credits & budgets (`CreditsPage`, `UsagePage`, `BudgetPage`)

These map to `accounting-service` (confirmed —
`/Users/sgdowd/Documents/Projects/EODH/repos/accounting-service`, routes defined in
`accounting_service/app/app.py`). Today's real API bills in raw quantity + £ per SKU —
**`credits` as a unit don't exist anywhere in the live system yet**; the whole credit-pool
model (balance, burn rate, top-up, per-resource budgets) is still only the proposal in the
credits-ledger design docs. All three pages stay fully illustrative (in-memory React state,
resets on refresh) until that lands. Real endpoints today, for reference:

- `GET /api/workspaces/:id/accounting/usage-data` — raw consumption events for a workspace
  (`event_start`, `event_end`, `item` (SKU), `quantity`), optionally aggregated by day/month
  via `?time-aggregation=`. No credits, no price — quantity only.
- `GET /api/accounts/:accountId/accounting/usage-data` — the same, across every workspace in
  one billing account, already callable by a `hub_admin` for any account (`account_authz`'s
  `allow_hub_admin` bypass in `app.py`) — a real, partial answer to the Platform Admin Usage
  page's cross-workspace need, though scoped to one account at a time rather than literally
  every workspace on the platform.
- `GET /api/accounting/skus` / `GET /api/accounting/skus/{sku}` — the resource catalogue
  (`sku`, `name`, `unit`) the Credits page's "Burn rate" table currently hardcodes as mock
  data.
- `GET /api/accounting/prices` — current price per unit, **in pounds**, not credits.

To make the mocked pages real, thought through page by page — a few things only surface
once _quantity_ (what's real today) is separated from _credits_ (what nothing computes
yet), and _"this month"_ (what the UI shows) from _balance_ (what the design actually
tracks):

### Credits page

1. **Balance read** — `GET /api/workspaces/:id/accounting/balance`, once the ledger exists.
   Whole-pool (`item_id IS NULL`, per the schema doc's `credit_balance_snapshot`) is enough
   for what's built; a per-SKU breakdown is there later if a richer view is wanted.
2. **Burn-rate table** — currently hardcoded mock data. The real source for this **isn't**
   `/api/accounting/prices` — that's pounds per unit, the old model. It's the pricing
   policy's `credits_per_unit` per SKU (schema doc's `pricing_policy_rate`), which needs its
   own read endpoint, e.g. `GET /api/accounting/pricing-policy` returning the current
   version's rates and category multipliers. This is scoping task 3 ("expose pricing-policy
   version history via an API"), just pointed at credits instead of pounds.
3. **Top-up** — `POST /api/workspaces/:id/accounting/credits`, **`hub_admin`-only**
   (decided). Whether this stays reachable from a member-facing "Buy more credits" button or
   moves to an admin-only surface is a UI question flagged separately, not an API one.

### Usage page

This is where "credits used" and "quantity" genuinely diverge, and it changes what the
real endpoint should be, not just what fields it returns.

- **Short-term**: extending today's `GET .../usage-data` (`BillingEvent`-based) with `user`
  — as already scoped below — only ever gives _quantity_ per user, per SKU. That's enough
  for the user-filter and table columns, but not enough for a meaningful "total credits" per
  user, because summing raw quantity across different SKUs (CPU-seconds + GB-months + API
  calls) means nothing without a price attached to each one first.
- **Real target**: once the credit ledger exists, the Usage page should read from _it_, not
  `BillingEvent` — each ledger row already carries a computed `credits` value (schema doc),
  so a per-user total becomes a plain `SUM`. This needs a read endpoint over
  `CreditLedgerTransaction` (extending `/usage-data` once ledger rows exist, or a new
  `/api/workspaces/:id/accounting/ledger`) with the same `start`/`end`/`limit`/`user`/
  `time-aggregation` filters as the existing endpoint.
- **This is a schema gap, not just an API gap.** `CreditLedgerTransaction` as currently
  designed (schema doc) has **no `user` column** — unlike `BillingEvent`, which has one
  today (`models.py:309`). If the ledger is built as currently specified, the per-user
  attribution that exists right now would be _lost_, not just missing an endpoint to expose
  it. Worth raising directly: the ledger needs a `user: Mapped[UUID | None]` column, carried
  through from `BillingEvent.user` at debit-ingestion time (task 2a) — otherwise the Usage
  page's per-user requirement can't be met for real regardless of what the API layer does.
- Either way, aggregation needs to preserve `user` in its `GROUP BY` — already flagged below
  for the interim endpoint; the same requirement carries over once the ledger-based one
  exists.
- `BillingEvent.user`/the ledger's future `user` column are Keycloak user UUIDs, not
  usernames — `accounting-service` deliberately holds no user identities (decisions doc),
  so resolving that UUID to what the UI shows is Keycloak's or
  `eodhp-workspace-services`'s job, not a change to this service alone.

### Budget page

Two decisions were open here; both are now settled.

1. **Balance, not "used this month" — decided.** The mock's `usedThisMonth`/`threshold`/
   `Alerts` group (a calendar-month quota that resets) is dropped. Nothing in the
   credit-ledger design tracks a resetting period — it's balance-only, a running total
   against a negative-balance limit (D4/D5) — so the Compute section moves to match that:
   show the workspace's current balance against its negative-balance limit, with no
   calendar-month framing. **No new backend concept needed** — this was a frontend-only
   change. Storage is explicitly out of scope for this decision: it keeps its own separate
   model in the mock (a fixed £/month plan, not a balance or a quota) — see "not resolved
   here" below.
2. **One combined "Compute" number, not per-SKU — decided.** `workspace_budget` (schema
   doc) is keyed per resource type (`item_id`), which would give CPU and GPU separate
   limits. The product decision is to keep one combined number instead, matching the
   mock's current UI. This means the schema needs a new grouping concept it doesn't have
   today — some way to express "CPU and GPU share one limit" rather than one row per
   `item_id` — e.g. a shared `budget_group` the relevant SKUs point to, or a virtual
   `item_id` representing "compute" as a whole. The `pricing_policy_rate`/burn-rate side
   stays per-SKU regardless (Credits' burn-rate table is correct to show CPU and GPU
   separately at different rates) — only the _budget/limit_ side needs to combine them.
   Same combined-number treatment applies to the per-user default and overrides.

With both decided, the endpoint shapes are close to final — suggested paths, following the
service's own `/accounting/` sub-path convention:

- `GET`/`PUT /api/workspaces/:id/accounting/budget` — one workspace-wide balance-relative
  limit covering compute as a whole (CPU + GPU combined, per decision 2), plus the
  default-per-user value and whether per-user budgets are switched on for this workspace.
- `GET /api/workspaces/:id/accounting/budget/users` /
  `PUT /api/workspaces/:id/accounting/budget/users/:username` — list and set per-user
  overrides, same combined-number shape.
- Both still depend on the Usage page's user attribution existing on the read side first —
  a per-user budget has nothing to enforce against otherwise.
- Both still depend on the new compute-grouping concept from decision 2 existing in the
  schema before either endpoint can be built against real data.

### Authorization (all three pages)

`workspace_authz` in `app.py` already implements exactly the owner/member/hub_admin split
this doc keeps flagging as unresolved elsewhere: it reads `workspaces_owned` and
`workspaces` claims straight off the caller's JWT, with a `require_owner` flag other
endpoints already use. Budget endpoints would presumably set `require_owner=True` the same
way; whether a non-owner admin should also qualify is the same open question as
Members/Publisher above, now with a concrete mechanism to extend once multi-admin support
exists.

### Not resolved here, unchanged from before

- Storage's fixed-plan-vs-metered-credits mismatch (see the "Credits ledger UX gaps" note
  handed to the design's author) — a third open model question, alongside the two above.
- `UsagePage.tsx`'s existing source comment ("No usage API exists yet") is now inaccurate —
  a real one does exist, it just doesn't return what the page needs yet. Worth fixing when
  this section's other changes land.

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
