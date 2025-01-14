**Note: This workflow is currently disabled.**
# GitHub Actions Workflow for UI Deployment

This GitHub Actions workflow automates the build and deployment process for the EODH application across different environments based on the branch that triggers the workflow. It supports deployment for `develop` and`demo` branches.

## Workflow Triggers

- **Branches**: The workflow is triggered on push events to the `develop` and `demo`branches.

## Permissions

- **Read access** to repository contents.
- **Write access** to GitHub Pages and ID tokens.

## Concurrency

- Ensures that only one deployment runs at a time per branch to avoid conflicts.

## Jobs

### Build

1. **Setup**: Checks out the repository and sets up Node.js environment based on `.nvmrc`.
2. **Dependencies**: Installs dependencies using Yarn.
3. **Build**: Executes the build command with environment variables for different branches.
4. **Artifact Upload**: Uploads the build files to be used in the deployment job.

### Deploy to S3

1. **Setup AWS Credentials**: Configures AWS credentials for deployment.
2. **Install AWS CDK**: Installs AWS Cloud Development Kit.
3. **CDK Deploy**: Deploys infrastructure changes if the `iac/` directory is modified.
4. **Download Artifacts**: Downloads the build artifacts for the specific branch.
5. **Sync to S3**: Syncs the build files to an S3 bucket specific to the branch.

## Environment Variables

- Uses secrets for sensitive information like AWS credentials and Keycloak configuration.
- Utilizes custom variables for application configuration.

## Branch-Specific Actions

- **Develop and Feature Branches**: Builds with specific environment variables and deploys to a development S3 bucket.
- **Demo Branch**: Similar to develop but deploys to a demo-specific S3 bucket.

This workflow facilitates continuous integration and deployment by automating the build and deployment process tailored to branch-specific environments.
