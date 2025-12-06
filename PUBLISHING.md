# Publishing Guide for zenstack-graphql-hide-relations

This guide will help you publish the package to npm.

## Pre-Publishing Checklist

### 1. Update Package Metadata

Edit `package.json` and update the following fields:

```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/zenstack-hide-relations.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/zenstack-hide-relations/issues"
  },
  "homepage": "https://github.com/yourusername/zenstack-hide-relations#readme"
}
```

### 2. Create GitHub Repository (Optional but Recommended)

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/yourusername/zenstack-graphql-hide-relations.git
git branch -M main
git push -u origin main
```

### 3. Verify Build

```bash
npm run build
```

Check that `dist/` folder contains:
- `index.js`
- `index.d.ts`
- `index.d.ts.map`

### 4. Test Package Locally

Before publishing, test the package in your project:

```bash
# In the plugin directory
npm pack

# This creates zenstack-graphql-hide-relations-1.0.0.tgz
# Copy it to your project and install it:
npm install /path/to/zenstack-graphql-hide-relations-1.0.0.tgz
```

Or use npm link:

```bash
# In the plugin directory
npm link

# In your project directory
npm link zenstack-graphql-hide-relations
```

Then update your `schema.zmodel`:

```zmodel
plugin hideRelations {
  provider = 'zenstack-graphql-hide-relations'
  preprocessor = true
}
```

Run `zenstack generate` and verify it works correctly.

## Publishing to npm

### Step 1: Create npm Account

If you don't have an npm account:
1. Visit https://www.npmjs.com/signup
2. Create an account
3. Verify your email

### Step 2: Login to npm

```bash
npm login
```

Enter your:
- Username
- Password
- Email (this is public)

### Step 3: Check Package Name Availability

```bash
npm search zenstack-graphql-hide-relations
```

If the name is taken, update it in `package.json`:

```json
{
  "name": "@your-scope/zenstack-graphql-hide-relations"
}
```

Or choose a different name like:
- `zenstack-graphql-visibility`
- `zenstack-field-control`
- `zenstack-hide-fields`

### Step 4: Publish

```bash
# Dry run first (safe - won't actually publish)
npm publish --dry-run

# If everything looks good, publish for real
npm publish
```

For scoped packages:

```bash
npm publish --access public
```

### Step 5: Verify Publication

1. Visit https://www.npmjs.com/package/zenstack-graphql-hide-relations
2. Check that README displays correctly
3. Verify package version and metadata

## Post-Publishing

### 1. Add npm Badge to README

The badge in README.md will now work:
```markdown
[![npm version](https://badge.fury.io/js/zenstack-graphql-hide-relations.svg)](https://www.npmjs.com/package/zenstack-graphql-hide-relations)
```

### 2. Tag the Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. Create GitHub Release (Optional)

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose tag `v1.0.0`
4. Title: "v1.0.0 - Initial Release"
5. Copy changelog from CHANGELOG.md
6. Publish release

### 4. Update Your Project

In your original project (`turbo-starter`), update the plugin configuration:

```zmodel
// packages/database/prisma/schema.zmodel
plugin hideRelations {
  provider = 'zenstack-graphql-hide-relations'  // Changed from './plugins/hide-relations'
  preprocessor = true
}
```

Then:

```bash
# Install the published package
pnpm add -D zenstack-graphql-hide-relations

# Remove old plugin files
rm -rf packages/database/plugins/

# Regenerate schema
pnpm --filter @repo/database build
```

## Publishing Updates

When you make changes and want to publish a new version:

### 1. Update Version

```bash
# For bug fixes (1.0.0 → 1.0.1)
npm version patch

# For new features (1.0.0 → 1.1.0)
npm version minor

# For breaking changes (1.0.0 → 2.0.0)
npm version major
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag

### 2. Update CHANGELOG.md

Add your changes to CHANGELOG.md following the format.

### 3. Publish

```bash
git push && git push --tags
npm publish
```

## Troubleshooting

### Error: Package name too similar to existing packages

Choose a more unique name or use a scoped package (@your-username/package-name).

### Error: You must verify your email

Check your email and click the verification link from npm.

### Error: 402 Payment Required

This usually means you're trying to publish a scoped package as private. Use:
```bash
npm publish --access public
```

### Error: You do not have permission to publish

Make sure you're logged in with the correct account:
```bash
npm whoami
```

## Package Quality Checklist

Before publishing, ensure:

- [ ] README is comprehensive and includes examples
- [ ] LICENSE file is present
- [ ] package.json metadata is complete
- [ ] TypeScript types are included (`.d.ts` files)
- [ ] Build succeeds without errors
- [ ] Package works when installed locally
- [ ] CHANGELOG is up to date
- [ ] Git repository is clean
- [ ] Version number follows semver

## Support

After publishing, monitor:
- GitHub issues for bug reports
- npm download statistics
- User feedback and questions

Good luck with your npm package! 🚀
