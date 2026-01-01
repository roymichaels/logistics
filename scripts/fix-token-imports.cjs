#!/usr/bin/env node
/**
 * Fix Token Import Paths
 * Corrects relative import paths for tokens based on file location
 */

const fs = require('fs');
const path = require('path');

function getCorrectImportPath(filePath) {
  const srcDir = path.join(__dirname, '..', 'src');
  const relativePath = path.relative(srcDir, filePath);
  const depth = relativePath.split(path.sep).length - 1;

  // Calculate correct number of ../
  return '../'.repeat(depth) + 'styles/tokens';
}

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const correctPath = getCorrectImportPath(filePath);

  // Match any import from styles/tokens with wrong depth
  const wrongPatterns = [
    /from ['"]\.\.\/styles\/tokens['"]/g,
    /from ['"]\.\.\/\.\.\/\.\.\/styles\/tokens['"]/g,
  ];

  let modified = false;
  for (const pattern of wrongPatterns) {
    if (content.match(pattern)) {
      content = content.replace(pattern, `from '${correctPath}'`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath} -> ${correctPath}`);
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

console.log('🚀 Fixing token import paths...\n');

const srcDir = path.join(__dirname, '..', 'src');
let fixedCount = 0;

walkDir(srcDir, (filePath) => {
  if (filePath.includes('tokens.ts') && !filePath.includes('canonical')) {
    return; // Skip the tokens file itself
  }

  if (fixImports(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✨ Import path fix complete! Fixed ${fixedCount} files.`);
