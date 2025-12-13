#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface AuditResults {
  summary: Record<string, number>;
  files: {
    DELETE: Record<string, string>;
    [key: string]: Record<string, string>;
  };
}

interface PurgeStats {
  totalFiles: number;
  deleted: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

const force = process.argv.includes('--force');
const backup = process.argv.includes('--backup');
const dryRun = process.argv.includes('--dry-run');

function createBackup(filePath: string): void {
  const backupDir = path.join(projectRoot, '.deleted');
  const relativePath = path.relative(projectRoot, filePath);
  const backupPath = path.join(backupDir, relativePath);
  const backupDirPath = path.dirname(backupPath);

  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }

  fs.copyFileSync(filePath, backupPath);
}

function deleteFile(filePath: string, stats: PurgeStats): void {
  const fullPath = path.join(projectRoot, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipped (not found): ${filePath}`);
    stats.skipped++;
    return;
  }

  try {
    if (backup && !dryRun) {
      createBackup(fullPath);
    }

    if (!dryRun) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted: ${filePath}`);
      stats.deleted++;
    } else {
      console.log(`🔍 [DRY RUN] Would delete: ${filePath}`);
      stats.deleted++;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push({ file: filePath, error: errorMsg });
    stats.failed++;
    console.error(`❌ Failed to delete ${filePath}: ${errorMsg}`);
  }
}

function cleanEmptyDirectories(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanEmptyDirectories(fullPath);
    }
  }

  const remaining = fs.readdirSync(dirPath);
  if (remaining.length === 0) {
    fs.rmdirSync(dirPath);
    console.log(`🗑️  Removed empty directory: ${path.relative(projectRoot, dirPath)}`);
  }
}

async function promptConfirmation(): Promise<boolean> {
  if (force || dryRun) return true;

  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('\n⚠️  Are you sure you want to delete these files? (yes/no): ', (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main(): Promise<void> {
  console.log('🗑️  Auto-Purge Unused Files Script');
  console.log('===================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
  }

  const auditPath = path.join(projectRoot, 'audit-results.json');

  if (!fs.existsSync(auditPath)) {
    console.error(`❌ Audit results file not found: ${auditPath}`);
    console.error('   Run the repo-audit script first to generate audit results.');
    process.exit(1);
  }

  let auditResults: AuditResults;

  try {
    const auditContent = fs.readFileSync(auditPath, 'utf-8');
    auditResults = JSON.parse(auditContent);
  } catch (error) {
    console.error(`❌ Failed to parse audit results: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  if (!auditResults.files || !auditResults.files.DELETE) {
    console.error('❌ No DELETE section found in audit results');
    process.exit(1);
  }

  const filesToDelete = Object.keys(auditResults.files.DELETE);
  const stats: PurgeStats = {
    totalFiles: filesToDelete.length,
    deleted: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  if (filesToDelete.length === 0) {
    console.log('✨ No files marked for deletion');
    return;
  }

  console.log(`📋 Files to delete: ${filesToDelete.length}\n`);

  filesToDelete.slice(0, 10).forEach((file) => {
    console.log(`   - ${file}`);
  });

  if (filesToDelete.length > 10) {
    console.log(`   ... and ${filesToDelete.length - 10} more`);
  }

  const confirmed = await promptConfirmation();

  if (!confirmed) {
    console.log('\n❌ Operation cancelled by user');
    process.exit(0);
  }

  console.log('\n🚀 Starting deletion...\n');

  if (backup && !dryRun) {
    console.log('💾 Creating backups in .deleted/ directory\n');
  }

  for (const file of filesToDelete) {
    deleteFile(file, stats);
  }

  if (!dryRun) {
    console.log('\n🧹 Cleaning empty directories...\n');
    const srcDir = path.join(projectRoot, 'src');
    cleanEmptyDirectories(srcDir);
  }

  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Total files: ${stats.totalFiles}`);
  console.log(`Deleted: ${stats.deleted}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }

  if (backup && stats.deleted > 0 && !dryRun) {
    console.log('\n💡 Tip: Backups saved to .deleted/ directory');
    console.log('   You can restore files from there if needed');
  }

  if (dryRun && stats.deleted > 0) {
    console.log('\n💡 Run without --dry-run to actually delete files');
  }

  if (!dryRun && stats.deleted > 0) {
    console.log('\n✨ Purge complete! Remember to:');
    console.log('   1. Run: npm run build');
    console.log('   2. Check for broken imports');
    console.log('   3. Test the application');
  }
}

main().catch((error) => {
  console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
