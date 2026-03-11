# Pre-Commit Hooks Setup (Optional)

This guide explains how to set up pre-commit hooks to run checks before each commit.

## Quick Setup with Husky (Recommended)

### 1. Install Husky

```bash
npm install --save-dev husky
npx husky init
```

### 2. Create Pre-Commit Hook

```bash
echo "npm run lint && npm run typecheck" > .husky/pre-commit
chmod +x .husky/pre-commit
```

### 3. (Optional) Add Pre-Push Hook

```bash
echo "npm run ci" > .husky/pre-push
chmod +x .husky/pre-push
```

## Manual Git Hook Setup

If you prefer not to install husky, set up hooks manually:

### Create Pre-Commit Hook

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

echo "Running pre-commit checks..."

# Run linter
echo "→ Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint failed. Please fix errors before committing."
  exit 1
fi

# Run type check
echo "→ Running TypeScript type check..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Please fix before committing."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
EOF

chmod +x .git/hooks/pre-commit
```

### Create Pre-Push Hook

```bash
cat > .git/hooks/pre-push << 'EOF'
#!/bin/sh

echo "Running pre-push checks..."

# Run all CI checks
npm run ci
if [ $? -ne 0 ]; then
  echo "❌ CI checks failed. Please fix before pushing."
  exit 1
fi

echo "✅ Pre-push checks passed!"
EOF

chmod +x .git/hooks/pre-push
```

## What Gets Checked

### Pre-Commit (Fast)
- ✅ ESLint code quality checks
- ✅ TypeScript type checking

### Pre-Push (Comprehensive)
- ✅ ESLint
- ✅ TypeScript
- ✅ Next.js build

## Skipping Hooks

Sometimes you need to skip hooks (use sparingly):

```bash
# Skip pre-commit hook
git commit --no-verify -m "commit message"

# Skip pre-push hook
git push --no-verify
```

## Benefits

1. **Catch errors early** - Before they reach CI
2. **Faster feedback** - Local checks are faster than CI
3. **Save CI minutes** - Don't waste CI time on obvious errors
4. **Better commits** - Ensures quality before pushing

## Troubleshooting

### Hook doesn't run

```bash
# Check if hook is executable
ls -la .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit
```

### Hook runs but always fails

```bash
# Test manually
npm run lint
npm run typecheck

# Check Node.js version
node --version  # Should be 20+
```

### Want to update hook

Just re-run the creation command - it will overwrite the existing hook.
