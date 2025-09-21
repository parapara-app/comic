# GitHub Actions Workflows

## CI/CD Pipeline Overview

This repository uses GitHub Actions for continuous integration and deployment. The pipeline consists of the following workflows:

### 1. Frontend CI (`frontend-ci.yml`)
- **Triggers**: Push/PR to main/develop branches when frontend files change
- **Jobs**:
  - Lint and TypeScript type checking
  - Unit tests with coverage reporting
  - Production build verification
  - Security vulnerability scanning
- **Node Version**: 24 (latest LTS)

### 2. Backend CI (`backend-ci.yml`)
- **Triggers**: Push/PR to main/develop branches when backend files change
- **Jobs**:
  - Rust formatting and clippy linting
  - Unit and integration tests with PostgreSQL
  - Production build verification
  - Security vulnerability scanning
- **Rust Version**: Stable

### 3. Docker Build (`docker-build.yml`)
- **Triggers**: Push to main/develop, PR, or release publication
- **Jobs**:
  - Build multi-platform Docker images (amd64, arm64)
  - Push to GitHub Container Registry (ghcr.io)
  - Security scanning with Trivy
- **Registry**: ghcr.io/parapara-app/comic

### 4. Deployment (`deploy.yml`)
- **Triggers**:
  - Manual workflow dispatch for production
  - Automatic: main → production
- **Environments**:
  - **Production**: Auto-deploy from main branch or manual deploy with version tag, blue-green deployment, and automatic rollback on failure
- **Features**:
  - Health checks after deployment
  - Slack notifications
  - Database backups for production
  - Automatic rollback on production failures

### 5. OpenAI Code Review (`openai-review.yml`)
- **Triggers**: Pull request opened/synchronized/reopened
- **Jobs**:
  - **AI Code Review**: Analyzes code changes using GPT-4
  - **Security Pattern Check**: Detects security vulnerabilities
  - **Performance Analysis**: Identifies performance issues (for PRs with 'perf' or 'optimize' in title)
- **Features**:
  - Automatic PR comments with review feedback
  - Security vulnerability detection with pattern matching
  - Performance optimization suggestions
  - Inline comments for critical issues
- **Node Version**: 24

## Required Secrets

Configure these secrets in GitHub repository settings:

### Production Environment
- `PROD_DEPLOY_HOST`: Production server hostname
- `PROD_DEPLOY_USER`: SSH username for production server
- `PROD_DEPLOY_KEY`: SSH private key for production server

### Other
- `SLACK_WEBHOOK`: Slack webhook URL for notifications
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `OPENAI_API_KEY`: OpenAI API key for AI code review (required for OpenAI review workflow)

## Usage

### Running CI Checks Locally

```bash
# Frontend
cd frontend
npm ci
npm run lint
npm run type-check
npm test

# Backend
cd backend
cargo fmt -- --check
cargo clippy -- -D warnings
cargo test
```

### Manual Deployment

1. Go to Actions tab in GitHub
2. Select "Deploy to Environment" workflow
3. Click "Run workflow"
4. Select target environment and version
5. Monitor deployment progress

### Docker Images

Images are automatically built and pushed to:
- `ghcr.io/parapara-app/comic/frontend:[tag]`
- `ghcr.io/parapara-app/comic/backend:[tag]`

Tags:
- `latest`: Latest from main branch
- `v1.2.3`: Semantic version tags
- `main-abc123`: SHA-based tags

## Monitoring

- Check workflow runs: https://github.com/parapara-app/comic/actions
- Container registry: https://github.com/parapara-app/comic/packages
- Deployment status: Check environment URLs in workflow outputs

## OpenAI Code Review Setup

### Prerequisites

1. **Create OpenAI API Key**:
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Add as GitHub secret: `OPENAI_API_KEY`

2. **Install Dependencies**:
   ```bash
   cd .github/scripts
   npm install
   ```

3. **Usage**:
   - Automatic: Opens a PR, the OpenAI review runs automatically
   - Manual testing: `OPENAI_API_KEY=sk-... node .github/scripts/openai-review.js`

### Review Types

- **Code Review**: General code quality, bugs, and suggestions
- **Security Review**: Vulnerability detection and security patterns
- **Performance Review**: Performance optimization opportunities

### Customization

Edit the review scripts in `.github/scripts/` to:
- Adjust review criteria
- Modify OpenAI prompts
- Change review formatting
- Add custom patterns