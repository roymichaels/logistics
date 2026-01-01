#!/usr/bin/env node
/**
 * Final ROYAL_COLORS Cleanup Script
 * Removes remaining imports and handles edge cases
 */

const fs = require('fs');
const path = require('path');

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove all royalTheme imports
  const importPatterns = [
    /import\s+{\s*ROYAL_COLORS\s*}\s+from\s+['"][^'"]*royalTheme['"]\s*;?\n?/g,
    /import\s+{\s*ROYAL_STYLES\s*}\s+from\s+['"][^'"]*royalTheme['"]\s*;?\n?/g,
    /import\s+{\s*ROYAL_COLORS,\s*ROYAL_STYLES\s*}\s+from\s+['"][^'"]*royalTheme['"]\s*;?\n?/g,
    /import\s+{\s*ROYAL_STYLES,\s*ROYAL_COLORS\s*}\s+from\s+['"][^'"]*royalTheme['"]\s*;?\n?/g,
  ];

  for (const pattern of importPatterns) {
    if (content.match(pattern)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  }

  // Replace edge case colors
  const edgeCases = [
    { from: /ROYAL_COLORS\.emerald/g, to: 'tokens.colors.status.success' },
    { from: /ROYAL_COLORS\.purple/g, to: 'tokens.colors.brand.primary' },
    { from: /ROYAL_COLORS\.indigo/g, to: 'tokens.colors.brand.secondary' },
    { from: /ROYAL_STYLES\.emptyStateSub/g, to: 'styles.emptyState.text' },
  ];

  for (const { from, to } of edgeCases) {
    if (content.match(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(filePath);
    }
  }
}

console.log('🚀 Running final ROYAL_COLORS cleanup...\n');

const srcDir = path.join(__dirname, '..', 'src');
let fixedCount = 0;

walkDir(srcDir, (filePath) => {
  if (migrateFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✨ Final cleanup complete! Fixed ${fixedCount} files.`);
