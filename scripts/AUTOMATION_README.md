# Automated Migration Scripts

These scripts automate the cleanup and migration of the legacy codebase to enforce the unified shell architecture.

## Scripts Overview

### 1. Auto-Clean Headers (`auto-clean-headers.ts`)

Removes legacy header components and imports from page files.

**What it does:**
- Scans all `.tsx` files in `src/pages/` directory
- Removes legacy header patterns like `<Header>`, `<AppHeader>`, `<StoreHeader>`, etc.
- Removes related import statements
- Cleans up empty lines and orphaned tags
- Creates backup files with `.backup` extension

**Usage:**
```bash
# Dry run (preview changes)
npm run clean:headers:dry

# Apply changes
npm run clean:headers

# Direct execution
npx tsx scripts/auto-clean-headers.ts
npx tsx scripts/auto-clean-headers.ts --dry-run
npx tsx scripts/auto-clean-headers.ts --verbose
```

**Options:**
- `--dry-run` - Preview changes without modifying files
- `--verbose` - Show detailed output including skipped files

---

### 2. Auto-Purge Unused Files (`purge-unused.ts`)

Deletes files marked for removal in `audit-results.json`.

**What it does:**
- Reads the DELETE list from `audit-results.json`
- Safely deletes each file with error handling
- Optionally creates backups in `.deleted/` directory
- Cleans up empty directories after deletion
- Provides interactive confirmation (unless forced)

**Usage:**
```bash
# Dry run (preview deletions)
npm run clean:unused:dry

# Apply with interactive confirmation
npm run clean:unused

# Force without confirmation
npx tsx scripts/purge-unused.ts --force

# Create backups before deletion
npx tsx scripts/purge-unused.ts --backup
```

**Options:**
- `--dry-run` - Preview deletions without actually deleting
- `--force` - Skip confirmation prompt
- `--backup` - Create backups in `.deleted/` directory

**Prerequisites:**
- Run `npm run qa` first to generate `audit-results.json`

---

### 3. Force Unified Shell (`force-unified-shell.ts`)

Enforces the unified shell architecture by updating flags and removing legacy code.

**What it does:**
- Updates `src/migration/flags.ts` to set all flags to `true`
- Adds `FORCE_SHELL = true` export
- Removes code between `/* MIGRATION START */` and `/* MIGRATION END */` markers in App.tsx
- Removes `legacyRoutes` object definitions
- Verifies UnifiedShellRouter is present
- Creates backup files before modifications

**Usage:**
```bash
# Dry run (preview changes)
npm run migrate:force-shell:dry

# Apply changes
npm run migrate:force-shell

# Direct execution
npx tsx scripts/force-unified-shell.ts
npx tsx scripts/force-unified-shell.ts --dry-run
```

**Options:**
- `--dry-run` - Preview changes without modifying files

---

## Full Migration Workflow

Run all three scripts in sequence:

```bash
# Run full migration (headers -> unused files -> shell enforcement)
npm run migrate:full
```

This executes:
1. `npm run clean:headers`
2. `npm run clean:unused`
3. `npm run migrate:force-shell`

---

## Safety Features

All scripts include:

- **Backup Creation**: Original files backed up before modification
- **Error Handling**: Continues processing even if individual files fail
- **Dry Run Mode**: Preview changes before applying
- **Idempotent**: Safe to run multiple times
- **Git Integration**: Changes tracked and reversible via git

---

## Best Practices

### Before Running

1. **Commit current changes:**
   ```bash
   git add .
   git commit -m "Checkpoint before automation"
   ```

2. **Create backup branch:**
   ```bash
   git checkout -b backup-before-automation
   git checkout main
   ```

3. **Run with dry-run first:**
   ```bash
   npm run clean:headers:dry
   npm run clean:unused:dry
   npm run migrate:force-shell:dry
   ```

### After Running

1. **Review changes:**
   ```bash
   git diff
   ```

2. **Build and verify:**
   ```bash
   npm run build:web
   ```

3. **Test the application:**
   ```bash
   npm run dev
   ```

4. **Check for broken imports:**
   - Look for TypeScript errors
   - Test key functionality
   - Review console for errors

5. **Clean up backup files:**
   ```bash
   find src -name "*.backup" -delete
   rm -rf .deleted/
   ```

---

## Troubleshooting

### Script Execution Errors

If you get `Cannot find module` errors:
```bash
npm install
```

If you get permission errors:
```bash
chmod +x scripts/*.ts
```

### TypeScript Errors After Running

1. Check for missing imports
2. Verify removed files weren't still in use
3. Run TypeScript compiler:
   ```bash
   npx tsc --noEmit
   ```

### Reverting Changes

To undo all changes:
```bash
# Restore from git
git reset --hard HEAD

# Or use backup files
find src -name "*.backup" -exec sh -c 'mv "$1" "${1%.backup}"' _ {} \;
```

---

## Output Examples

### Success Output
```
✅ Cleaned: src/pages/Dashboard.tsx (3 patterns removed)
✅ Deleted: src/styles/header.css
✅ Updated flags.ts (5 changes)
```

### Warning Output
```
⚠️  Warning: UnifiedShellRouter not found in App.tsx
⏭️  Skipped (not found): src/nonexistent/file.tsx
```

### Error Output
```
❌ Failed to delete src/file.tsx: Permission denied
❌ Failed to process src/App.tsx: ENOENT
```

---

## Configuration

Scripts use these paths relative to project root:

- **Pages directory**: `src/pages/`
- **Flags file**: `src/migration/flags.ts`
- **App file**: `src/App.tsx`
- **Audit results**: `audit-results.json`
- **Backup directory**: `.deleted/`

---

## Integration with CI/CD

These scripts can be integrated into CI pipelines:

```yaml
# .github/workflows/cleanup.yml
name: Automated Cleanup
on:
  workflow_dispatch:
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run migrate:full
      - run: npm run build:web
```

---

## Support

If you encounter issues:

1. Check this README
2. Review script output for error messages
3. Inspect backup files created
4. Examine git diff for unexpected changes
5. Run with `--verbose` flag for more details
