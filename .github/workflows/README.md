# GitHub Actions Deployment Setup

This workflow automatically builds and deploys the FitnessMealPlanner application to DigitalOcean App Platform.

## Required Secrets

You need to add the following secrets to your GitHub repository:

1. **DIGITALOCEAN_ACCESS_TOKEN**
   - Your DigitalOcean API token
   - Create one at: https://cloud.digitalocean.com/account/api/tokens
   - Required scopes: Read & Write

2. **DO_APP_ID**
   - Your DigitalOcean App ID: `600abc04-b784-426c-8799-0c09f8b9a958`

## How to Add Secrets

1. Go to your GitHub repository
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each secret with the names above

## Workflow Behavior

- **Main branch**: Builds Docker image, pushes to registry, and automatically deploys
- **Develop branch**: Builds and pushes Docker image with `develop` tag
- **Feature branches**: Builds and pushes Docker image with feature branch name as tag
- **Pull requests**: Builds Docker image but doesn't push (for testing)

## Docker Tags

The workflow creates the following tags:
- `prod` - for main branch
- `latest` - for main branch
- `develop` - for develop branch
- `feature-branch-name` - for feature branches
- `pr-123` - for pull requests

## Manual Deployment

You can also trigger the workflow manually from the Actions tab using the "workflow_dispatch" event.
