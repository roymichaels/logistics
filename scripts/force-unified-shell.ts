#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface ModificationStats {
  flagsChanged: number;
  codeBlocksRemoved: number;
  filesModified: string[];
  warnings: string[];
  errors: string[];
}

const dryRun = process.argv.includes('--dry-run');

function updateMigrationFlags(): { modified: boolean; changes: number } {
  const flagsPath = path.join(projectRoot, 'src', 'migration', 'flags.ts');

  if (!fs.existsSync(flagsPath)) {
    console.error(`❌ Migration flags file not found: ${flagsPath}`);
    return { modified: false, changes: 0 };
  }

  const content = fs.readFileSync(flagsPath, 'utf-8');
  let modified = content;
  let changes = 0;

  modified = modified.replace(/:\s*false/g, (match) => {
    changes++;
    return ': true';
  });

  if (!modified.includes('FORCE_SHELL')) {
    modified += '\nexport const FORCE_SHELL = true;\n';
    changes++;
  }

  if (modified !== content) {
    if (!dryRun) {
      fs.writeFileSync(`${flagsPath}.backup`, content, 'utf-8');
      fs.writeFileSync(flagsPath, modified, 'utf-8');
    }
    return { modified: true, changes };
  }

  return { modified: false, changes: 0 };
}

function removeCodeBetweenMarkers(
  content: string,
  startMarker: string,
  endMarker: string
): { cleaned: string; blocksRemoved: number } {
  let cleaned = content;
  let blocksRemoved = 0;

  const regex = new RegExp(
    `\\/\\*\\s*${startMarker}\\s*\\*\\/[\\s\\S]*?\\/\\*\\s*${endMarker}\\s*\\*\\/`,
    'g'
  );

  const matches = cleaned.match(regex);
  if (matches) {
    blocksRemoved = matches.length;
    cleaned = cleaned.replace(regex, '');
  }

  return { cleaned, blocksRemoved };
}

function removeLegacyRoutes(content: string): { cleaned: string; removed: boolean } {
  let cleaned = content;
  let removed = false;

  const legacyRoutesPattern = /const\s+legacyRoutes\s*=\s*\{[^}]*\};?\s*\n?/gs;
  if (legacyRoutesPattern.test(cleaned)) {
    cleaned = cleaned.replace(legacyRoutesPattern, '');
    removed = true;
  }

  const legacyRoutesPattern2 = /const\s+legacyRoutes:\s*Record<[^>]*>\s*=\s*\{[\s\S]*?\};?\s*\n?/gs;
  if (legacyRoutesPattern2.test(cleaned)) {
    cleaned = cleaned.replace(legacyRoutesPattern2, '');
    removed = true;
  }

  return { cleaned, removed };
}

function updateAppFile(stats: ModificationStats): void {
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  if (!fs.existsSync(appPath)) {
    stats.warnings.push('App.tsx not found - skipping App.tsx modifications');
    console.log('⚠️  App.tsx not found - skipping');
    return;
  }

  let content = fs.readFileSync(appPath, 'utf-8');
  let modified = content;
  let hasChanges = false;

  const { cleaned: cleanedMigration, blocksRemoved } = removeCodeBetweenMarkers(
    modified,
    'MIGRATION START',
    'MIGRATION END'
  );

  if (blocksRemoved > 0) {
    modified = cleanedMigration;
    stats.codeBlocksRemoved += blocksRemoved;
    hasChanges = true;
    console.log(`✅ Removed ${blocksRemoved} migration code block(s) from App.tsx`);
  }

  const { cleaned: cleanedRoutes, removed: routesRemoved } = removeLegacyRoutes(modified);

  if (routesRemoved) {
    modified = cleanedRoutes;
    hasChanges = true;
    console.log('✅ Removed legacyRoutes definitions from App.tsx');
  }

  modified = modified.replace(/\n{3,}/g, '\n\n');

  if (!modified.includes('UnifiedShellRouter')) {
    stats.warnings.push('UnifiedShellRouter not found in App.tsx - may need manual verification');
    console.log('⚠️  Warning: UnifiedShellRouter not found in App.tsx');
  }

  if (!modified.includes('migrationFlags')) {
    stats.warnings.push('migrationFlags not imported in App.tsx - may need manual verification');
    console.log('⚠️  Warning: migrationFlags not imported in App.tsx');
  }

  if (hasChanges && modified !== content) {
    if (!dryRun) {
      fs.writeFileSync(`${appPath}.backup`, content, 'utf-8');
      fs.writeFileSync(appPath, modified, 'utf-8');
      stats.filesModified.push('src/App.tsx');
    }
    console.log(`${dryRun ? '🔍 [DRY RUN]' : '✅'} Modified: src/App.tsx`);
  } else {
    console.log('⏭️  No changes needed in App.tsx');
  }
}

function verifyUnifiedShell(stats: ModificationStats): void {
  const routerPath = path.join(projectRoot, 'src', 'migration', 'UnifiedShellRouter.tsx');

  if (!fs.existsSync(routerPath)) {
    stats.warnings.push('UnifiedShellRouter.tsx not found - unified shell may not be properly set up');
    console.log('⚠️  Warning: UnifiedShellRouter.tsx not found');
  } else {
    console.log('✅ UnifiedShellRouter.tsx exists');
  }

  const shellContextPath = path.join(projectRoot, 'src', 'context', 'ShellContext.tsx');

  if (!fs.existsSync(shellContextPath)) {
    stats.warnings.push('ShellContext.tsx not found - shell context may be missing');
    console.log('⚠️  Warning: ShellContext.tsx not found');
  } else {
    console.log('✅ ShellContext.tsx exists');
  }
}

function main(): void {
  console.log('🚀 Force Unified Shell Script');
  console.log('==============================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const stats: ModificationStats = {
    flagsChanged: 0,
    codeBlocksRemoved: 0,
    filesModified: [],
    warnings: [],
    errors: [],
  };

  console.log('📝 Step 1: Updating migration flags...\n');

  const { modified: flagsModified, changes: flagChanges } = updateMigrationFlags();

  if (flagsModified) {
    stats.flagsChanged = flagChanges;
    stats.filesModified.push('src/migration/flags.ts');
    console.log(`${dryRun ? '🔍 [DRY RUN]' : '✅'} Updated flags.ts (${flagChanges} changes)`);
  } else {
    console.log('⏭️  All flags already enabled');
  }

  console.log('\n📝 Step 2: Cleaning App.tsx...\n');

  updateAppFile(stats);

  console.log('\n📝 Step 3: Verifying unified shell setup...\n');

  verifyUnifiedShell(stats);

  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Flags changed: ${stats.flagsChanged}`);
  console.log(`Code blocks removed: ${stats.codeBlocksRemoved}`);
  console.log(`Files modified: ${stats.filesModified.length}`);

  if (stats.filesModified.length > 0) {
    console.log('\nModified files:');
    stats.filesModified.forEach((file) => console.log(`   - ${file}`));
  }

  if (stats.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    stats.warnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach((error) => console.log(`   - ${error}`));
  }

  if (!dryRun && stats.filesModified.length > 0) {
    console.log('\n💡 Next steps:');
    console.log('   1. Review the changes with git diff');
    console.log('   2. Run: npm run build');
    console.log('   3. Test the application');
    console.log('   4. Remove .backup files if everything works');
  }

  if (dryRun && (stats.flagsChanged > 0 || stats.codeBlocksRemoved > 0)) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }

  if (!dryRun && stats.filesModified.length > 0) {
    console.log('\n✨ Unified shell enforcement complete!');
  }
}

main();
