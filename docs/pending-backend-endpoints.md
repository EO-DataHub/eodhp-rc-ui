# Pending backend endpoints — reference table

A flat, scannable list of every backend endpoint `pending-backend-apis.md` says is needed —
new or extended — grouped by the same pages. This table is the "what"; for the "why" (the
mocked behaviour each row exists to replace, and the reasoning behind each choice), see
[`pending-backend-apis.md`](./pending-backend-apis.md) and search for the section name
quoted above each group below.

**Status legend:** `New` — endpoint doesn't exist today. `Extend` — endpoint exists, needs a
field or behaviour added. `TBD` — exact path not yet decided, only the shape is.

Several rows share the same open authorization question, noted inline as **(open Q)**:
whether only the workspace _owner_ can call them, or any _admin_ can too. Not resolved in
either doc.

## Members — "Members page"

| Method | Path                                   | Request body             | Response / behaviour                                                        | Auth                                  | Status |
| ------ | -------------------------------------- | ------------------------ | --------------------------------------------------------------------------- | ------------------------------------- | ------ |
| GET    | `/api/workspaces/:id/users`            | –                        | add a `role` field (`owner` / `admin` / `member`) per member                | Any member (Q - or just admin?)       | Extend |
| PUT    | `/api/workspaces/:id/admins/:username` | –                        | 200, promotes to admin                                                      | Owner **(open Q)**                    | New    |
| DELETE | `/api/workspaces/:id/admins/:username` | –                        | 200, demotes to member                                                      | Owner **(open Q)**                    | New    |
| POST   | `/api/workspaces/:id/owner/transfer`   | `{ newOwner: username }` | 200; atomically sets new owner _and_ moves the outgoing owner into `admins` | Current owner only                    | New    |
| DELETE | `/api/workspaces/:id/users/:username`  | –                        | reject 403 if `:username` is the current owner                              | Owner (existing `mustBeAccountOwner`) | Extend |

## Workspace category — "Workspace category"

| Method | Path                                                                | Request body                               | Response / behaviour                         | Auth              | Status     |
| ------ | ------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- | ----------------- | ---------- |
| GET    | `/api/workspaces/:id` (or dedicated `/api/workspaces/:id/category`) | –                                          | `category` field (`commercial` / `research`) | Any member (read) | New/Extend |
| PUT    | `/api/workspaces/:id/category`                                      | `{ category: 'commercial' \| 'research' }` | 200                                          | `hub_admin`       | New        |

## Workspace integrations — "Workspace integrations — Dask, GPU"

| Method | Path                                                                    | Request body                                        | Response / behaviour                                        | Auth              | Status     |
| ------ | ----------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- | ----------------- | ---------- |
| GET    | `/api/workspaces/:id` (or dedicated `/api/workspaces/:id/integrations`) | –                                                   | `dask_enabled`, `gpu_enabled` booleans                      | Any member (read) | New/Extend |
| PUT    | `/api/workspaces/:id/integrations`                                      | `{ dask_enabled?: boolean, gpu_enabled?: boolean }` | 200; likely triggers real provisioning, not just a DB write | `hub_admin`       | New        |

## Platform admin usage — "Platform admin usage"

| Method | Path                    | Request body | Response / behaviour                                                       | Auth        | Status |
| ------ | ----------------------- | ------------ | -------------------------------------------------------------------------- | ----------- | ------ |
| GET    | `/api/admin/workspaces` | –            | every workspace on the platform, regardless of the caller's own membership | `hub_admin` | New    |

Also depends on the usage-ledger endpoint below (same gap as the per-workspace Usage page,
just aggregated across workspaces instead of by user within one).

## Profile — "Profile page"

| Method | Path                                                                                   | Request body | Response / behaviour                                                                                                        | Auth                      | Status |
| ------ | -------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------ |
| DELETE | account-deletion endpoint — Keycloak itself or a wrapper in front of it (path **TBD**) | –            | reject 403/409, with the list of workspaces needing an ownership transfer first, if the caller currently owns any workspace | Authenticated user (self) | New    |

## Publisher — visibility — "Publisher page"

| Method | Path                              | Request body                            | Response / behaviour                                                    | Auth                        | Status |
| ------ | --------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- | --------------------------- | ------ |
| GET    | `.../catalogs/.../collections`    | –                                       | add a `visibility` field per collection                                 | Any member (read)           | Extend |
| PUT    | `.../collections/{id}/visibility` | `{ visibility: 'public' \| 'private' }` | 200; should be safe to retry (a slow confirm click could double-submit) | Owner or admin **(open Q)** | New    |
| GET    | `.../catalogs/.../processes`      | –                                       | add a `visibility` field per workflow                                   | Any member (read)           | Extend |
| PUT    | `.../processes/{id}/visibility`   | `{ visibility: 'public' \| 'private' }` | 200; same retry-safety note                                             | Owner or admin **(open Q)** | New    |

## Files — visibility — "Files page"

| Method | Path                                        | Request body                            | Response / behaviour              | Auth                        | Status |
| ------ | ------------------------------------------- | --------------------------------------- | --------------------------------- | --------------------------- | ------ |
| GET    | `/api/workspaces/:id/files`                 | –                                       | add a `visibility` field per file | Any member (read)           | Extend |
| PUT    | `.../files/:storeType/:fileName/visibility` | `{ visibility: 'public' \| 'private' }` | 200                               | Owner or admin **(open Q)** | New    |

## Accounting — usage & budgets — "Accounting / Billing — per-user usage & budgets"

| Method  | Path                                                     | Request body                                        | Response / behaviour                                                                                             | Auth                        | Status |
| ------- | -------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| GET     | usage-ledger endpoint (path **TBD** — doesn't exist yet) | –                                                   | usage records including a `user` field; ideally a server-side per-user aggregate rather than client-side summing | Any member (read)           | New    |
| GET/PUT | default per-user budget for a workspace (path **TBD**)   | `{ enabled: boolean, defaultThreshold: number }`    | 200                                                                                                              | Owner or admin **(open Q)** | New    |
| GET/PUT | per-user budget overrides (path **TBD**)                 | `{ workspace, username, threshold, alertsEnabled }` | 200                                                                                                              | Owner or admin **(open Q)** | New    |

---

**Not included:** the combined-upload endpoint from Option A of the publishing-flow
redesign (`pending-backend-apis.md`'s last section) — that document deliberately excludes it
from its concrete list since nothing currently mocked depends on it, so it's left out here
too for the same reason.
