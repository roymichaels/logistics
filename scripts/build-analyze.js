#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function getGzippedSize(filePath) {
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  return gzipped.length;
}

function formatBytes(bytes) {
  return Math.round(bytes / 1024);
}

console.log('📊 BUNDLE ANALYSIS\n');

const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Dist folder not found. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(distPath, { recursive: true });
const jsFiles = files.filter(f => f.endsWith('.js'));
const cssFiles = files.filter(f => f.endsWith('.css'));

console.log('JavaScript Chunks:');
console.log('| Chunk | Raw (KB) | Gzipped (KB) |');
console.log('|-------|----------|--------------|');

let totalRaw = 0;
let totalGzipped = 0;

jsFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const rawSize = fs.statSync(filePath).size;
  const gzippedSize = getGzippedSize(filePath);
  
  totalRaw += rawSize;
  totalGzipped += gzippedSize;
  
  console.log(`| ${file} | ${formatBytes(rawSize)} | ${formatBytes(gzippedSize)} |`);
});

if (cssFiles.length > 0) {
  console.log('\nCSS Files:');
  cssFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    const rawSize = fs.statSync(filePath).size;
    const gzippedSize = getGzippedSize(filePath);
    
    totalRaw += rawSize;
    totalGzipped += gzippedSize;
    
    console.log(`| ${file} | ${formatBytes(rawSize)} | ${formatBytes(gzippedSize)} |`);
  });
}

console.log('\n**TOTALS:**');
console.log(`Raw: ${formatBytes(totalRaw)} KB`);
console.log(`Gzipped: ${formatBytes(totalGzipped)} KB`);

if (formatBytes(totalGzipped) > 150) {
  console.log('\n⚠️  **WARNING**: Bundle exceeds 150 KB target');
  process.exit(1);
} else if (formatBytes(totalGzipped) > 100) {
  console.log('\n✅ Bundle within 150 KB target (consider optimizing further)');
} else {
  console.log('\n🎯 **EXCELLENT**: Bundle well under target!');
}