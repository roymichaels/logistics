#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface CleanStats {
  filesScanned: number;
  filesModified: number;
  patternsRemoved: number;
  errors: string[];
}

const LEGACY_PATTERNS = [
  /<Header\s+[^>]*>/gi,
  /<AppHeader\s+[^>]*>/gi,
  /<StoreHeader\s+[^>]*>/gi,
  /<BusinessHeader\s+[^>]*>/gi,
  /<DriverHeader\s+[^>]*>/gi,
  /<PageHeader\s+[^>]*>/gi,
  /<LegacyHeader\s+[^>]*>/gi,
  /<PageContainer\s+[^>]*>/gi,
  /<AppViewport\s+[^>]*>/gi,
  /<MainLayout\s+[^>]*>/gi,
  /<Layout\s+[^>]*>/gi,
  /title\s*=\s*["'][^"']*["']/gi,
  />\s*App\s*</gi,
];

const IMPORT_PATTERNS = [
  /import\s+\{[^}]*Header[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?\s*\n?/gi,
  /import\s+Header\s+from\s+['"][^'"]*['"]\s*;?\s*\n?/gi,
  /import\s+\{[^}]*PageContainer[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?\s*\n?/gi,
  /import\s+\{[^}]*AppViewport[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?\s*\n?/gi,
];

const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');

function cleanContent(content: string): { cleaned: string; count: number } {
  let cleaned = content;
  let count = 0;

  for (const pattern of IMPORT_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      count += matches.length;
      cleaned = cleaned.replace(pattern, '');
    }
  }

  for (const pattern of LEGACY_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      count += matches.length;
      cleaned = cleaned.replace(pattern, '');
    }
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^\s*\n/gm, '\n');

  return { cleaned, count };
}

function processFile(filePath: string, stats: CleanStats): void {
  stats.filesScanned++;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { cleaned, count } = cleanContent(content);

    if (cleaned !== content) {
      stats.filesModified++;
      stats.patternsRemoved += count;

      if (!dryRun) {
        const backupPath = `${filePath}.backup`;
        fs.writeFileSync(backupPath, content, 'utf-8');
        fs.writeFileSync(filePath, cleaned, 'utf-8');
        console.log(`✅ Cleaned: ${path.relative(projectRoot, filePath)} (${count} patterns removed)`);
        if (verbose) {
          console.log(`   Backup created: ${path.relative(projectRoot, backupPath)}`);
        }
      } else {
        console.log(`🔍 [DRY RUN] Would clean: ${path.relative(projectRoot, filePath)} (${count} patterns)`);
      }
    } else if (verbose) {
      console.log(`⏭️  Skipped (no changes): ${path.relative(projectRoot, filePath)}`);
    }
  } catch (error) {
    const errorMsg = `Failed to process ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
  }
}

function scanDirectory(dirPath: string, stats: CleanStats): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath, stats);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        processFile(fullPath, stats);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
  }
}

function main(): void {
  console.log('🧹 Auto-Clean Headers Script');
  console.log('============================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const stats: CleanStats = {
    filesScanned: 0,
    filesModified: 0,
    patternsRemoved: 0,
    errors: [],
  };

  const pagesDir = path.join(projectRoot, 'src', 'pages');

  if (!fs.existsSync(pagesDir)) {
    console.error(`❌ Pages directory not found: ${pagesDir}`);
    process.exit(1);
  }

  console.log(`📂 Scanning: ${path.relative(projectRoot, pagesDir)}\n`);

  scanDirectory(pagesDir, stats);

  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Files scanned: ${stats.filesScanned}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Patterns removed: ${stats.patternsRemoved}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach((error) => console.log(`   - ${error}`));
  }

  if (!dryRun && stats.filesModified > 0) {
    console.log('\n💡 Tip: Backup files created with .backup extension');
    console.log('   Run `find src/pages -name "*.backup" -delete` to remove them');
  }

  if (dryRun && stats.filesModified > 0) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main();
