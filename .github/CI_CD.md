# CI/CD Pipeline Documentation

This document describes the CI/CD setup for the Paperboy RSS Reader project.

## Overview

The project uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, security, and functionality before changes are merged.

## Workflows

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `claude/*` branches
- Pull requests to `main` or `develop`

**Jobs:**

#### Lint & Type Check
- Runs ESLint to check code quality
- Performs TypeScript type checking
- Ensures code follows project conventions

#### Prisma Validate
- Validates Prisma schema syntax
- Checks for schema inconsistencies
- Ensures database schema is valid

#### Build
- Builds the Next.js application
- Generates Prisma client
- Verifies build artifacts are created
- Runs with mock DATABASE_URL for CI environment

#### Security Audit
- Runs `npm audit` to check for vulnerabilities
- Fails on high-severity issues
- Warns on moderate-severity issues

#### Test
- Runs test suite (currently placeholder)
- Sets up test database
- Will execute actual tests when test suite is added

#### All Checks
- Summary job that requires all other jobs to pass
- Provides clear pass/fail status for the entire pipeline

### 2. PR Checks (`.github/workflows/pr-checks.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Jobs:**

#### PR Metadata Check
- Validates PR title follows conventional commit format
- Expected formats: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Can be skipped by adding `[skip-check]` to title

#### File Size Check
- Detects files larger than 1MB
- Warns about potential issues
- Suggests optimization strategies

#### Code Quality
- Checks for TODO/FIXME comments in changes
- Detects console.log statements (suggests using logger)
- Promotes best practices

#### Dependency Check
- Lists new dependencies added
- Runs security audit
- Helps reviewers understand dependency changes

### 3. CodeQL Security Analysis (`.github/workflows/codeql.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests
- Weekly schedule (Mondays at 6:00 AM UTC)

**Features:**
- Advanced security analysis for JavaScript/TypeScript
- Detects common vulnerabilities (SQL injection, XSS, etc.)
- Runs extended security and quality queries
- Results visible in GitHub Security tab

### 4. Dependabot (`.github/dependabot.yml`)

**Schedule:**
- Weekly updates every Monday at 9:00 AM

**Features:**
- Automatically creates PRs for dependency updates
- Groups minor/patch updates together
- Separate updates for:
  - Production dependencies
  - Development dependencies
  - GitHub Actions
- Assigns to @kstenson for review
- Labels PRs with `dependencies` and `automated`

## Status Checks

All pull requests must pass these checks before merging:

1. ✅ Lint & Type Check
2. ✅ Prisma Schema Validation
3. ✅ Build Success
4. ✅ Security Audit (high-severity only)
5. ✅ Tests (when implemented)

## NPM Scripts for CI

The following scripts are used in CI:

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run typecheck     # TypeScript type checking
npm run build         # Build Next.js app
npm run test          # Run tests (placeholder)
npm run ci            # Run all CI checks locally
```

## Running CI Checks Locally

Before pushing code, run CI checks locally:

```bash
# Run all checks
npm run ci

# Individual checks
npm run lint
npm run typecheck
npm run build

# Fix linting issues
npm run lint:fix

# Validate Prisma schema
npm run prisma:validate
```

## CI Environment Variables

The CI pipeline uses these environment variables:

```env
DATABASE_URL="file:./dev.db"  # For build
NODE_ENV="test"                # For tests
```

These are set in the workflow files and don't need to be configured in GitHub Secrets.

## Troubleshooting

### Build Fails in CI but Works Locally

1. **Dependency issues:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript errors:**
   ```bash
   npm run typecheck
   ```

3. **Prisma client out of sync:**
   ```bash
   npx prisma generate
   ```

### Security Audit Failures

1. **Check vulnerabilities:**
   ```bash
   npm audit
   ```

2. **Fix automatically:**
   ```bash
   npm audit fix
   ```

3. **Review breaking changes:**
   ```bash
   npm audit fix --force
   ```

### PR Title Format Errors

Valid prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

Examples:
- ✅ `feat: add dark mode toggle`
- ✅ `fix(api): resolve rate limiting issue`
- ✅ `docs: update README`
- ❌ `Added new feature`
- ❌ `bug fix`

## Security

### CodeQL Analysis

CodeQL scans run automatically and results appear in:
- GitHub Security tab
- Pull request checks
- Weekly scheduled scans

### Dependency Scanning

- Dependabot alerts for vulnerable dependencies
- Weekly automated update PRs
- `npm audit` runs on every PR

## Future Enhancements

### When Adding Tests

Update `.github/workflows/ci.yml` test job:

```yaml
- name: Run tests
  run: npm test
  env:
    DATABASE_URL: "file:./test.db"
    NODE_ENV: "test"

- name: Upload coverage
  uses: codecov/codecov-action@v3
  if: always()
```

### Deployment Pipeline

Consider adding:
1. Automatic deployment to staging on `develop` branch
2. Production deployment on `main` branch tags
3. Preview deployments for PRs (Vercel/Netlify)
4. Database migration checks before deployment

### Additional Checks

Future improvements:
- Bundle size analysis
- Lighthouse performance scores
- Visual regression testing
- E2E test suite
- Accessibility testing (axe-core)

## Branch Protection

Recommended branch protection rules for `main`:

- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass
  - Lint & Type Check
  - Build
  - Security Audit
- ✅ Require branches to be up to date
- ✅ Require signed commits (optional)
- ✅ Include administrators

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Next.js CI/CD Best Practices](https://nextjs.org/docs/deployment)
