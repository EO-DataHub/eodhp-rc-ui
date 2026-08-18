# Pending backend endpoints — reference table

A flat, scannable list of every backend endpoint grouped by the frontend pages it is needed by.

Two different kinds of "admin" appear below — don't conflate them. Owner/admin/member are roles _within one workspace_ (see the Members section). `hub_admin` is a separate, platform-wide role (assigned in Keycloak, not per-workspace) that can act across every workspace on the platform — it's what gates the Workspace category, Workspace integrations, and Platform admin usage endpoints.

## Members — "Members page"

| Method | Path                                   | Request body             | Description                                                                        | Auth               |
| ------ | -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- | ------------------ |
| GET    | `/api/workspaces/:id/users`            | –                        | Add a `role` field (`owner` / `admin` / `member`) to each member                   | Any member         |
| PUT    | `/api/workspaces/:id/admins/:username` | –                        | Promotes a member to admin                                                         | Owner              |
| DELETE | `/api/workspaces/:id/admins/:username` | –                        | Demotes an admin back to member                                                    | Owner              |
| POST   | `/api/workspaces/:id/owner/transfer`   | `{ newOwner: username }` | Transfers ownership: sets the new owner and moves the outgoing owner into `admins` | Current owner only |
| DELETE | `/api/workspaces/:id/users/:username`  | –                        | Removes a member from the workspace; rejects if `:username` is the current owner   | Owner              |

## Workspace category — "Workspace category"

| Method | Path                                                                | Request body                               | Description                                                  | Auth        |
| ------ | ------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ | ----------- |
| GET    | `/api/workspaces/:id` (or dedicated `/api/workspaces/:id/category`) | –                                          | Returns the workspace's category (`commercial` / `research`) | Any member  |
| PUT    | `/api/workspaces/:id/category`                                      | `{ category: 'commercial' \| 'research' }` | Sets the workspace's category                                | `hub_admin` |

## Workspace integrations — "Workspace integrations — Dask, GPU"

| Method | Path                                                                    | Request body                                        | Description                                                             | Auth        |
| ------ | ----------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| GET    | `/api/workspaces/:id` (or dedicated `/api/workspaces/:id/integrations`) | –                                                   | Returns whether Dask and GPU integrations are enabled for the workspace | Any member  |
| PUT    | `/api/workspaces/:id/integrations`                                      | `{ dask_enabled?: boolean, gpu_enabled?: boolean }` | Enables/disables Dask and/or GPU integration for the workspace          | `hub_admin` |

## Platform admin usage — "Platform admin usage"

| Method | Path                    | Request body | Description                                                                        | Auth        |
| ------ | ----------------------- | ------------ | ---------------------------------------------------------------------------------- | ----------- |
| GET    | `/api/admin/workspaces` | –            | Returns every workspace on the platform, regardless of the caller's own membership | `hub_admin` |

Combined with the existing `GET /api/accounts/:accountId/accounting/usage-data` (see the
Accounting group below), this is what powers the platform-wide usage view.

## Profile — "Profile page"

| Method | Path                                                                                   | Request body | Description                                                                                                                                 | Auth                      |
| ------ | -------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| DELETE | account-deletion endpoint — Keycloak itself or a wrapper in front of it (path **TBD**) | –            | Deletes the caller's own account; rejects with the list of workspaces needing an ownership transfer first, if the caller currently owns any | Authenticated user (self) |

## Publisher — visibility — "Publisher page"

"Collections" are the entries listed under the Publisher page's Catalogue tab; "processes"
are the entries listed under its Workflows tab. Both are STAC terms already used by the
existing catalogue API, not new concepts.

| Method | Path                              | Request body                            | Description                                 | Auth           |
| ------ | --------------------------------- | --------------------------------------- | ------------------------------------------- | -------------- |
| GET    | `.../catalogs/.../collections`    | –                                       | Add a `visibility` field to each collection | Any member     |
| PUT    | `.../collections/{id}/visibility` | `{ visibility: 'public' \| 'private' }` | Sets a collection's visibility              | Owner or admin |
| GET    | `.../catalogs/.../processes`      | –                                       | Add a `visibility` field to each workflow   | Any member     |
| PUT    | `.../processes/{id}/visibility`   | `{ visibility: 'public' \| 'private' }` | Sets a workflow's visibility                | Owner or admin |

## Files — visibility — "Files page"

`:storeType` is `object` or `block` — which underlying storage backend the file lives in,
shown as the "Store" column on the Files page.

| Method | Path                                        | Request body                            | Description                           | Auth           |
| ------ | ------------------------------------------- | --------------------------------------- | ------------------------------------- | -------------- |
| GET    | `/api/workspaces/:id/files`                 | –                                       | Add a `visibility` field to each file | Any member     |
| PUT    | `.../files/:storeType/:fileName/visibility` | `{ visibility: 'public' \| 'private' }` | Sets a file's visibility              | Owner or admin |

## Accounting — usage, credits & budgets — "Accounting / Billing — usage, credits & budgets"

The billing backend (`accounting-service`, routes in `accounting_service/app/app.py`) already
has real endpoints for usage and pricing today — but only in raw quantity and pounds (£),
with no concept of "credits" at all. Every row below is a credit-based endpoint on top of
that.

| Method  | Path                                                                         | Request body                                                                     | Description                                                                                                                                                                                              | Auth             |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| GET     | `/api/accounting/pricing-policy`                                             | –                                                                                | Credit cost per unit for each billable resource (e.g. CPU, GPU), plus the commercial/research multiplier — the per-resource pricing shown on the Credits page                                            | Any              |
| GET     | credit-ledger read endpoint `/api/workspaces/:id/accounting/ledger`          | –                                                                                | Same filters as today's raw-quantity usage endpoint (date range, limit, per-user, aggregation period) but returns `credits` per row/aggregate — real target for the Usage page                           | Any member       |
| GET     | credit-balance endpoint `/api/workspaces/:id/accounting/balance`             | –                                                                                | Workspace's current credit balance, for the Credits page                                                                                                                                                 | Any member       |
| POST    | credit top-up/grant endpoint `/api/workspaces/:id/accounting/balance`        | `{ amount: number }`                                                             | Tops up/grants credits to the workspace                                                                                                                                                                  | `hub_admin` only |
| GET/PUT | `/api/workspaces/:id/accounting/budget`                                      | `{ enabled: boolean, defaultUserThreshold: number, workspaceThreshold: number }` | Reads/sets one combined spending limit covering CPU + GPU together, matching the Budget page's single "compute" number, plus the default per-user threshold and whether per-user budgets are switched on | Owner            |
| GET/PUT | `/api/workspaces/:id/accounting/budget/users` / `.../budget/users/:username` | `{ username, threshold, alertsEnabled }`                                         | Lists/sets per-user budget overrides, same combined-number shape as the row above                                                                                                                        | Owner            |

---

**Not included:** the combined-upload endpoint from Option A of the publishing-flow
redesign (`pending-backend-apis.md`'s last section) — that document deliberately excludes it
from its concrete list since nothing currently mocked depends on it, so it's left out here
too for the same reason.
