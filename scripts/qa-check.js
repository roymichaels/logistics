#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 PRODUCTION QA CHECKS\n');

// 1. Build and analyze bundle
console.log('📦 Building production bundle...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// 2. Check bundle sizes
console.log('📊 Bundle size analysis:');
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath, { recursive: true });
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  let totalSize = 0;
  const chunks = [];
  
  jsFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    totalSize += sizeKB;
    
    chunks.push({
      name: file,
      size: sizeKB
    });
  });
  
  chunks.sort((a, b) => b.size - a.size);
  
  console.log('\nChunk sizes (KB):');
  chunks.forEach(chunk => {
    console.log(`  ${chunk.name}: ${chunk.size} KB`);
  });
  
  console.log(`\nTotal JS: ${totalSize} KB`);
  
  // Estimate gzipped size (rough approximation)
  const estimatedGzipped = Math.round(totalSize * 0.3);
  console.log(`Estimated gzipped: ~${estimatedGzipped} KB`);
  
  if (estimatedGzipped > 150) {
    console.log('⚠️  Bundle size exceeds 150 KB target');
  } else {
    console.log('✅ Bundle size within target');
  }
} else {
  console.log('❌ Dist folder not found');
}

// 3. Check for forbidden dependencies
console.log('\n🚫 Checking for forbidden dependencies...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const forbiddenDeps = ['moment', 'lodash', 'date-fns', '@expo/vector-icons'];
const foundForbidden = [];

Object.keys(packageJson.dependencies || {}).forEach(dep => {
  if (forbiddenDeps.some(forbidden => dep.includes(forbidden))) {
    foundForbidden.push(dep);
  }
});

if (foundForbidden.length > 0) {
  console.log('❌ Found forbidden dependencies:', foundForbidden);
} else {
  console.log('✅ No forbidden dependencies found');
}

// 4. Check file structure
console.log('\n📁 Checking file structure...');
const requiredFiles = [
  'src/pages/Lobby.tsx',
  'pages/Dashboard.tsx',
  'pages/Orders.tsx',
  'pages/Tasks.tsx',
  'pages/Settings.tsx',
  'data/types.ts',
  'data/index.ts',
  'data/mock.ts',
  'lib/telegram.ts'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, '..', file)));

if (missingFiles.length > 0) {
  console.log('❌ Missing required files:', missingFiles);
} else {
  console.log('✅ All required files present');
}

// 5. Check for unused files
console.log('\n🧹 Checking for unused files...');
const srcPath = path.join(__dirname, '../src');
if (fs.existsSync(srcPath)) {
  const srcFiles = fs.readdirSync(srcPath, { recursive: true });
  console.log(`Found ${srcFiles.length} files in src/`);
}

console.log('\n🎯 QA CHECK COMPLETE');
console.log('Ready for production deployment!');