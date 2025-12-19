/**
 * Script to replace telegram_id references with getUserIdentifier
 */

const fs = require('fs');
const path = require('path');

// Critical files to fix
const filesToFix = [
  'src/lib/frontendDataStore.ts',
  'src/lib/inventoryService.ts',
  'src/lib/userManager.ts',
  'src/lib/sessionTracker.ts',
];

const projectRoot = path.resolve(__dirname, '..');

function fixFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Check if getUserIdentifier is already imported
    const hasImport = content.includes("from '../utils/userIdentifier'") ||
                      content.includes('from "../utils/userIdentifier"') ||
                      content.includes("from './utils/userIdentifier'");

    // Find the last import
    if (!hasImport && content.includes('this.user.telegram_id')) {
      const importRegex = /^import\s+.*?;$/gm;
      const imports = content.match(importRegex);

      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;

        const depth = filePath.split('/').length - 2;
        const relativePath = '../'.repeat(depth) + 'utils/userIdentifier';
        const newImport = `\nimport { getUserIdentifier } from '${relativePath}';`;
        content = content.slice(0, insertPosition) + newImport + content.slice(insertPosition);
        modified = true;
      }
    }

    // Replace patterns
    const replacements = [
      {
        pattern: /this\.user\.telegram_id/g,
        replacement: 'getUserIdentifier(this.user)',
        description: 'this.user.telegram_id -> getUserIdentifier(this.user)'
      },
      {
        pattern: /profile\.telegram_id/g,
        replacement: 'getUserIdentifier(profile)',
        description: 'profile.telegram_id -> getUserIdentifier(profile)'
      },
      {
        pattern: /user\.telegram_id/g,
        replacement: 'getUserIdentifier(user)',
        description: 'user.telegram_id -> getUserIdentifier(user)'
      },
      {
        pattern: /currentUser\.telegram_id/g,
        replacement: 'getUserIdentifier(currentUser)',
        description: 'currentUser.telegram_id -> getUserIdentifier(currentUser)'
      },
    ];

    for (const { pattern, replacement, description } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
        console.log(`  ✓ ${description}`);
      }
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ ${filePath} - updated`);
      return true;
    } else {
      console.log(`✓ ${filePath} - no changes needed`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath} - error:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing telegram_id references...\n');

let fixed = 0;
let skipped = 0;

for (const file of filesToFix) {
  console.log(`\nProcessing ${file}:`);
  const result = fixFile(file);
  if (result) fixed++;
  else skipped++;
}

console.log(`\n✨ Done!`);
console.log(`   Fixed: ${fixed}`);
console.log(`   Skipped: ${skipped}`);
