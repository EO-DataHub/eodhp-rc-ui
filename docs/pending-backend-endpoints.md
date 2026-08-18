# Pending backend endpoints — reference table

A flat, scannable list of every backend endpoint `pending-backend-apis.md` says is needed —
new or extended — grouped by the same pages. This table is the "what"; for the "why" (the
mocked behaviour each row exists to replace, and the reasoning behind each choice), see
[`pending-backend-apis.md`](./pending-backend-apis.md) and search for the section name
quoted above each group below.

**Status legend:** `New` — endpoint doesn't exist today. `Extend` — endpoint exists, needs a
field or behaviour added. `TBD` — exact path not yet decided, only the shape is. `Blocked`
— shape is decided, but it depends on a schema/data-model change that doesn't exist yet
(not just "someone needs to write this endpoint").

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

`GET /api/accounts/:accountId/accounting/usage-data` already exists and does most of this
for one billing account at a time (see the Accounting group below) — this row is really
"loop that across every account" plus the workspace-listing endpoint above, not a wholly new
usage-aggregation mechanism.

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

## Accounting — usage, credits & budgets — "Accounting / Billing — usage, credits & budgets"

Confirmed repo: `accounting-service`, routes in `accounting_service/app/app.py`. Rows below
marked `Real` already exist today — but bill in raw quantity/£, not credits; the whole
credit-pool concept (balance, top-up, per-resource budgets) is still just the design docs'
proposal, not implemented anywhere in this service yet.

| Method  | Path                                                                         | Request body                                                                                                                                  | Response / behaviour                                                                                                                                                                                            | Auth                              | Status  |
| ------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------- |
| GET     | `/api/accounting/pricing-policy`                                             | –                                                                                                                                             | credit cost per unit for each billable resource (e.g. CPU, GPU), plus the commercial/research multiplier applied to it — the per-resource pricing shown on the Credits page                                    | Any (read)                        | New     |
| GET     | credit-ledger read endpoint `/api/workspaces/:id/accounting/ledger`          | –                                                                                                                                             | real target for the Usage page: same filters as `usage-data` (`start`/`end`/`limit`/`user`/`time-aggregation`) but returns `credits` per row/aggregate, not raw quantity.                                       | Any member (read)                 | Blocked |
| GET     | credit-balance endpoint `/api/workspaces/:id/accounting/balance`             | –                                                                                                                                             | workspace's current credit balance, for the Credits page                                                                                                                                                        | Any member (read)                 | New     |
| POST    | credit top-up/grant endpoint `/api/workspaces/:id/accounting/balance`        | `{ amount: number }`                                                                                                                          | 200                                                                                                                                                                                                             | `hub_admin` only                  | New     |
| GET/PUT | `/api/workspaces/:id/accounting/budget`                                      | `{ enabled: boolean, defaultUserThreshold: number, workspaceThreshold: number }` — one combined balance-relative limit for compute as a whole | 200. this needs a new grouping concept (e.g. a shared `budget_group`, or a virtual "compute" `item_id`) before CPU+GPU can share one limit                                                                      | Owner                             | Blocked |
| GET/PUT | `/api/workspaces/:id/accounting/budget/users` / `.../budget/users/:username` | `{ username, threshold, alertsEnabled }` — same combined-number shape as the row above, per user                                              | 200; list and set per-user overrides                                                                                                                                                                            | Owner **(open Q: or any admin?)** | Blocked |

---

**Not included:** the combined-upload endpoint from Option A of the publishing-flow
redesign (`pending-backend-apis.md`'s last section) — that document deliberately excludes it
from its concrete list since nothing currently mocked depends on it, so it's left out here
too for the same reason.
