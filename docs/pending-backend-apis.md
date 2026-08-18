c# Pending backend APIs: roles, ownership & visibility

The Members, Publisher, and Files pages currently mock several controls purely
client-side (`localStorage`, no server calls) because the real APIs don't exist yet. This
doc lists what would need to be built for those controls to become real. Grouped by page.

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
   `{ newOwner: username }`. Must atomically set the new owner *and* move the previous
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
