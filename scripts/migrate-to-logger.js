#!/usr/bin/env node

/**
 * Migration script to replace console.log statements with structured logger
 *
 * Usage:
 *   node scripts/migrate-to-logger.js src/lib/supabaseClient.ts
 *   node scripts/migrate-to-logger.js src/**\/*.ts --dry-run
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const dryRun = process.argv.includes('--dry-run');
const files = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

if (files.length === 0) {
  console.log('Usage: node scripts/migrate-to-logger.js <file-pattern> [--dry-run]');
  console.log('Example: node scripts/migrate-to-logger.js "src/lib/**/*.ts"');
  process.exit(1);
}

// Mapping of console methods to logger methods
const consoleToLogger = {
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
  'console.debug': 'logger.debug',
};

// Count replacements
let totalReplacements = 0;
let filesModified = 0;

function shouldSkipFile(filePath) {
  const skipPatterns = [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    'scripts/migrate-to-logger.js',
  ];

  return skipPatterns.some(pattern => filePath.includes(pattern));
}

function migrateFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let fileReplacements = 0;

  // Check if logger is already imported
  const hasLoggerImport = /import.*logger.*from.*['"].*\/lib\/logger['"]/.test(content);

  // Replace console statements
  for (const [consoleMethod, loggerMethod] of Object.entries(consoleToLogger)) {
    const regex = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\(`, 'g');
    const matches = content.match(regex);

    if (matches) {
      newContent = newContent.replace(regex, `${loggerMethod}(`);
      fileReplacements += matches.length;
    }
  }

  if (fileReplacements > 0) {
    // Add logger import if not present
    if (!hasLoggerImport) {
      // Calculate relative path to logger
      const fileDir = path.dirname(filePath);
      const projectRoot = process.cwd();
      const relativePath = path.relative(fileDir, path.join(projectRoot, 'src/lib/logger'));
      const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

      // Add import after other imports or at the beginning
      const importStatement = `import { logger } from '${importPath}';\n`;

      if (newContent.includes('import')) {
        // Find the last import statement
        const lines = newContent.split('\n');
        let lastImportIndex = -1;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            lastImportIndex = i;
          }
        }

        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, importStatement);
          newContent = lines.join('\n');
        } else {
          newContent = importStatement + newContent;
        }
      } else {
        newContent = importStatement + newContent;
      }
    }

    console.log(`\n${filePath}:`);
    console.log(`  - ${fileReplacements} console statement(s) replaced`);

    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✓ File updated`);
    } else {
      console.log(`  (dry run - no changes made)`);
    }

    totalReplacements += fileReplacements;
    filesModified++;
  }
}

// Process files
console.log('Migrating console statements to structured logger...\n');

for (const pattern of files) {
  const matchedFiles = glob.sync(pattern, { nodir: true });

  if (matchedFiles.length === 0) {
    console.log(`No files matched pattern: ${pattern}`);
    continue;
  }

  for (const file of matchedFiles) {
    migrateFile(file);
  }
}

console.log('\n' + '='.repeat(50));
console.log(`Summary:`);
console.log(`  Files modified: ${filesModified}`);
console.log(`  Total replacements: ${totalReplacements}`);

if (dryRun) {
  console.log(`\nThis was a dry run. To apply changes, run without --dry-run flag.`);
} else {
  console.log(`\n✓ Migration complete!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review the changes: git diff`);
  console.log(`  2. Test the application: npm run dev`);
  console.log(`  3. Run linting: npm run lint:fix`);
  console.log(`  4. Commit changes: git add . && git commit -m "refactor: migrate to structured logger"`);
}
