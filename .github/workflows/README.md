# Deployments

`main` is the only long-lived branch. Feature work is merged to `main` through PRs. Releases are version tags.

| Trigger | Workflow | Deploys to | Config |
|---|---|---|---|
| Pull request (same-repo branches) | `preview.yml` | `https://preview.eodatahub.org.uk/rc/pr-<n>/`, removed when the PR closes | production |
| Push to `main` | `deploy-latest.yml` | `https://preview.eodatahub.org.uk/rc/latest/` | production |
| Tag `vX.Y.Z` | `release.yml` | `https://eodatahub.org.uk/static-apps/sg-rc-ui/prod/`, then creates a GitHub release | production |
| Manual, any ref | `deploy-environment.yml` | test or staging hub: `https://<env>.eodatahub.org.uk/static-apps/sg-rc-ui/<env>/` | test or staging |

`_deploy.yml` is the shared build-and-upload job that the last three call. Each deployed site has a `version.json` that shows the ref, commit and build time.

## Releasing

```sh
git switch main && git pull
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
```

The tag must point at a commit that contains `release.yml`.

**Hotfix while `main` has unreleased work:** merge the fix to `main` first. Then branch from the last release tag, cherry-pick the fix, and tag that branch (for example `v1.1.1`). The fix is in `main` already, so it's never made twice.

## Testing on test or staging

Use these when a change needs that hub's backend. Previews and `latest` use the production backend.

```sh
gh workflow run deploy-environment.yml -f environment=test -f ref=feat/my-branch
```

Or use **Actions → Deploy to test or staging → Run workflow**. Each environment holds one build, and the latest deploy wins.

## GitHub environments

Variables are read from the GitHub environment first, then from repository variables. Repository-level `VITE_*` variables are the production values.

| Environment | Used by | Must set |
|---|---|---|
| `preview` | `preview.yml`, `deploy-latest.yml` | `GHA_AWS_PREVIEW_ROLE`, `DEPLOYMENT_BUCKET`, `DEPLOYMENT_REGION` |
| `production` | `release.yml` | `GHA_AWS_DEPLOY_ROLE_EODH`, `DEPLOYMENT_BUCKET`, `DEPLOYMENT_FOLDER`, `VITE_BASE_PATH`, `VITE_GA_MEASUREMENT_ID` |
| `test`, `staging` | `deploy-environment.yml` | As production, plus every `VITE_*` URL that differs from production (hub, Keycloak, titiler, wf-catalogue, support-utils) |

The preview hosting (bucket, CloudFront, `PreviewDeploy-rc` role) is defined in [EO-DataHub/eodhp-frontend-previews](https://github.com/EO-DataHub/eodhp-frontend-previews).
