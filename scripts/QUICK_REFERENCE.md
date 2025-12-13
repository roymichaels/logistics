# Automation Scripts - Quick Reference

## Quick Start

### Preview All Changes (Recommended First Step)
```bash
npm run clean:headers:dry      # Preview header cleanup
npm run clean:unused:dry       # Preview file deletions
npm run migrate:force-shell:dry # Preview shell enforcement
```

### Apply Changes Individually
```bash
npm run clean:headers          # Remove legacy headers
npm run clean:unused           # Delete unused files
npm run migrate:force-shell    # Enforce unified shell
```

### Run Full Migration
```bash
npm run migrate:full           # All three scripts in sequence
```

## What Each Script Does

### `clean:headers`
- Removes `<Header>`, `<AppHeader>`, `<StoreHeader>`, etc.
- Removes title props and wrapper components
- Cleans up imports
- **Affects:** `src/pages/*.tsx` files

### `clean:unused`
- Deletes files from DELETE list in `audit-results.json`
- Removes empty directories
- **Affects:** 24 files marked for deletion

### `migrate:force-shell`
- Sets all migration flags to `true`
- Adds `FORCE_SHELL = true` export
- Removes legacy routing code
- **Affects:** `src/migration/flags.ts`, `src/App.tsx`

## Safety Features

All scripts:
- Create `.backup` files before modifying
- Support `--dry-run` mode for preview
- Continue on errors (don't fail completely)
- Provide detailed logging

## Test Results

Latest dry-run results show:
- **Headers**: 14 files to clean, 76 patterns to remove
- **Unused**: 24 files to delete
- **Shell**: 1 flag change needed

## Additional Options

### Headers Script
```bash
tsx scripts/auto-clean-headers.ts --verbose  # Show all files including skipped
```

### Unused Files Script
```bash
tsx scripts/purge-unused.ts --force          # Skip confirmation
tsx scripts/purge-unused.ts --backup         # Create backups in .deleted/
```

## Rollback

If something goes wrong:
```bash
# Restore from git
git reset --hard HEAD

# Or restore from backups
find src -name "*.backup" -exec sh -c 'mv "$1" "${1%.backup}"' _ {} \;
```

## Verification After Running

```bash
npm run build:web              # Check for build errors
npm run test                   # Run tests
git diff                       # Review changes
```

## Complete Workflow Example

```bash
# 1. Checkpoint
git add .
git commit -m "Before automation"

# 2. Preview
npm run clean:headers:dry
npm run clean:unused:dry
npm run migrate:force-shell:dry

# 3. Execute
npm run migrate:full

# 4. Verify
npm run build:web
git diff

# 5. Cleanup
find src -name "*.backup" -delete

# 6. Commit
git add .
git commit -m "Automated migration complete"
```

For detailed documentation, see [AUTOMATION_README.md](./AUTOMATION_README.md)
