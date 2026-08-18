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

| Method  | Path                                                       | Request body                                        | Response / behaviour                                                                                                                          | Auth                        | Status |
| ------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| GET     | `/api/workspaces/:id/accounting/usage-data`                 | –                                                    | raw consumption events (`event_start`, `event_end`, `item` SKU, `quantity`); `?time-aggregation=` (`day` or `month`) for totals | Any member (read)           | Real   |
| GET     | `/api/accounting/skus`, `/api/accounting/skus/{sku}`         | –                                                    | resource catalogue (`sku`, `name`, `unit`) — what Credits' "Burn rate" table currently hardcodes | Any (read)                  | Real   |
| GET     | `/api/accounting/prices`                                     | –                                                    | current price per unit, **in pounds**, not credits | Any (read)                  | Real   |
| GET     | `/api/workspaces/:id/accounting/usage-data` (extend)         | –                                                    | expose the already-existing `user` column (`models.py:309`) per event, add a `user` query filter, and stop nulling `user` out of the day/month aggregation query (`models.py:391-413`) | Any member (read)           | Extend |
| GET     | credit-balance endpoint (path **TBD** — depends on credit-ledger work landing, e.g. `/api/workspaces/:id/accounting/balance`) | – | workspace's current credit balance, for the Credits page | Any member (read)           | New    |
| POST    | credit top-up/grant endpoint (path **TBD**)                  | `{ amount: number }`                                 | 200; decided admin-only — the current mock's self-service "Buy more credits" (any member) doesn't match this and needs updating | `hub_admin` only            | New    |
| GET/PUT | `/api/workspaces/:id/accounting/budget` (suggested)          | `{ enabled: boolean, defaultThreshold: number, workspaceThreshold: number }` | 200 | Owner **(open Q: or any admin?)** | New    |
| GET/PUT | `/api/workspaces/:id/accounting/budget/users` / `.../budget/users/:username` (suggested) | `{ username, threshold, alertsEnabled }` | 200; list and set per-user overrides | Owner **(open Q: or any admin?)** | New    |

---

**Not included:** the combined-upload endpoint from Option A of the publishing-flow
redesign (`pending-backend-apis.md`'s last section) — that document deliberately excludes it
from its concrete list since nothing currently mocked depends on it, so it's left out here
too for the same reason.
