#!/usr/bin/env node
/**
 * Enhanced ROYAL_COLORS Migration Script v2
 * Handles local ROYAL_COLORS definitions and remaining references
 */

const fs = require('fs');
const path = require('path');

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove local ROYAL_COLORS definitions
  const localDefRegex = /const\s+ROYAL_COLORS\s*=\s*{[^}]*};/gs;
  if (content.match(localDefRegex)) {
    content = content.replace(localDefRegex, '');
    modified = true;
  }

  // Add import if ROYAL_COLORS is used but not imported
  if (content.includes('ROYAL_COLORS') && !content.includes("from '../styles/tokens'") && !content.includes('src/styles/tokens')) {
    // Add import at top after other imports
    const importRegex = /(import[^;]+;)\n(?!import)/;
    if (content.match(importRegex)) {
      content = content.replace(importRegex, "$1\nimport { tokens } from '../styles/tokens';\n");
      modified = true;
    }
  }

  // Replace all ROYAL_COLORS usage
  const replacements = [
    { from: /ROYAL_COLORS\.background(?!\.)/g, to: 'tokens.colors.background.primary' },
    { from: /ROYAL_COLORS\.card(?!B)/g, to: 'tokens.colors.background.card' },
    { from: /ROYAL_COLORS\.cardBorder/g, to: 'tokens.colors.border.default' },
    { from: /ROYAL_COLORS\.text/g, to: 'tokens.colors.text.primary' },
    { from: /ROYAL_COLORS\.muted/g, to: 'tokens.colors.text.secondary' },
    { from: /ROYAL_COLORS\.accent/g, to: 'tokens.colors.brand.primary' },
    { from: /ROYAL_COLORS\.gold/g, to: 'tokens.colors.status.warning' },
    { from: /ROYAL_COLORS\.teal/g, to: 'tokens.colors.brand.primary' },
    { from: /ROYAL_COLORS\.shadow/g, to: 'tokens.shadows.md' },
  ];

  for (const { from, to } of replacements) {
    if (content.match(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migrated: ${filePath}`);
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

console.log('🚀 Starting ROYAL_COLORS cleanup v2...\n');

const srcDir = path.join(__dirname, '..', 'src');
let migratedCount = 0;

walkDir(srcDir, (filePath) => {
  // Skip the tokens file itself
  if (filePath.includes('tokens.ts') && !filePath.includes('canonical-tokens')) {
    return;
  }

  if (migrateFile(filePath)) {
    migratedCount++;
  }
});

console.log(`\n✨ Cleanup complete! Fixed ${migratedCount} files.`);
