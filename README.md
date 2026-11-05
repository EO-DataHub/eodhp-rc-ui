# EO Data Hub Resource Catalogue User Interface Project

## Deployments

| Site | URL | Updated by |
|---|---|---|
| Production | https://eodatahub.org.uk/static-apps/sg-rc-ui/prod/ | Pushing a `vX.Y.Z` tag |
| Latest `main` | https://preview.eodatahub.org.uk/rc/latest/ | Every merge to `main` |
| Pull request previews | `https://preview.eodatahub.org.uk/rc/pr-<number>/` | Every push to a PR. Removed when the PR closes |
| Test hub | https://test.eodatahub.org.uk/static-apps/sg-rc-ui/test/index.html | Started by hand, any branch or tag |
| Staging hub | https://staging.eodatahub.org.uk/static-apps/sg-rc-ui/staging/index.html | Started by hand, any branch or tag |

`main` is the only long-lived branch. Work reaches it through PRs, and each PR gets its own preview. Production, latest and previews use the production backend. Each site has a `version.json` that shows which commit it is running, for example https://preview.eodatahub.org.uk/rc/latest/version.json.

See [Deployments](.github/workflows/README.md) for how to release, how to deploy to test or staging, and the GitHub environment settings.

## Routing

The app uses path URLs, for example `…/prod/my-data/saved-sets`. The router `basename` is the build's base path (`VITE_BASE_PATH`).

- **The host must serve `index.html` for app routes.** Otherwise a deep link or a page refresh returns 404. On the hub and preview sites a CloudFront Function does this: browser page loads (`Accept: text/html`) of paths that do not end in a known file extension get the site's `index.html`. Preview: `terraform/files/directory-index.js` in [eodhp-frontend-previews](https://github.com/EO-DataHub/eodhp-frontend-previews). Hub: `eodhp-deploy-infrastucture`.
- **Old hash links still work.** The site used hash routing (`…/prod/#/my-data/saved-sets`) until late 2026, so bookmarks and shared permalinks use that form. On load, `src/app/routerBase.ts` rewrites `#/route` to `/route`, and `…/index.html` to the app root, before the router starts. Keep this.
- To check a route with curl, send the browser's Accept header: `curl -sI -H 'Accept: text/html' <site>/my-data/saved-sets`.

## Installation and Usage

Follow the steps below to set up your own instance of the project.

### Install Project Dependencies

To set up the development environment for this project, you’ll need to install the following on your system:

- [Node.js](http://nodejs.org/) (refer to the `.nvmrc` file for the required version)
  - To manage multiple Node versions, we recommend using [nvm](https://github.com/creationix/nvm).
- [Yarn](https://yarnpkg.com/) as the package manager.

### Install Application Dependencies

If you use [`nvm`](https://github.com/creationix/nvm), activate the desired Node version:

```sh
nvm install
```

Install the necessary Node modules:

```sh
yarn install
```

### Set Environment Variables

An example file (`.env.sample`) is available with the environment variables used by the application. Create a new `.env` file by running:

```sh
cp .env.sample .env
```

Make sure the `.env` file is not committed to the repository, as it contains sensitive configuration data.


### Configure the STAC Collections

There are a couple of configuration files that need to be set up to make the application work with your STAC collections.

Please see the [Collection Configuration Documentation](docs/collection-configuration.md) for details.


### Starting the App

To start the application, run:

```sh
yarn dev
```

This will compile the JavaScript and launch the server, making the site available at `http://127.0.0.1:5173`.

The system will watch for file changes and automatically execute tasks whenever a change is detected. The site will automatically refresh, as it is bundled with live reload functionality.
