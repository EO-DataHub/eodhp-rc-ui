# EO Data Hub Resource Catalogue User Interface Project

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

### Starting the App

To start the application, run:

```sh
yarn dev
```

This will compile the JavaScript and launch the server, making the site available at `http://127.0.0.1:5173`.

The system will watch for file changes and automatically execute tasks whenever a change is detected. The site will automatically refresh, as it is bundled with live reload functionality.
