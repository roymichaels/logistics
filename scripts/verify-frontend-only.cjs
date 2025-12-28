#!/usr/bin/env node

/**
 * Frontend-Only Verification Script
 *
 * This script verifies that the application is correctly configured
 * for frontend-only operation with no backend dependencies.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Frontend-Only Configuration...\n');

let hasErrors = false;
const warnings = [];
const successes = [];

// 1. Check .env file
console.log('1️⃣ Checking .env configuration...');
try {
  const envPath = path.join(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');

  // Check if Supabase URLs are commented out
  const supabaseUrlActive = envContent.match(/^VITE_SUPABASE_URL=/m);
  const supabaseKeyActive = envContent.match(/^VITE_SUPABASE_ANON_KEY=/m);

  if (supabaseUrlActive || supabaseKeyActive) {
    console.log('   ❌ Supabase configuration is active in .env');
    console.log('   💡 Comment out VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    hasErrors = true;
  } else {
    console.log('   ✅ Supabase configuration is disabled');
    successes.push('.env properly configured');
  }

  // Check for frontend-only flag
  if (envContent.includes('VITE_USE_FRONTEND_ONLY=true')) {
    console.log('   ✅ Frontend-only mode enabled');
    successes.push('Frontend-only flag set');
  } else {
    console.log('   ⚠️  VITE_USE_FRONTEND_ONLY flag not set');
    warnings.push('Add VITE_USE_FRONTEND_ONLY=true to .env');
  }
} catch (error) {
  console.log('   ⚠️  .env file not found');
  warnings.push('Create .env file with VITE_USE_FRONTEND_ONLY=true');
}

console.log('');

// 2. Check supabaseClient.ts
console.log('2️⃣ Checking Supabase client mock...');
try {
  const clientPath = path.join(__dirname, '../src/lib/supabaseClient.ts');
  const clientContent = fs.readFileSync(clientPath, 'utf-8');

  if (clientContent.includes('mockSupabaseClient')) {
    console.log('   ✅ Supabase client is mocked');
    successes.push('supabaseClient.ts contains mock implementation');
  } else {
    console.log('   ❌ Supabase client is not properly mocked');
    hasErrors = true;
  }

  if (clientContent.includes('[FRONTEND-ONLY]')) {
    console.log('   ✅ Frontend-only logging present');
    successes.push('Mock client has proper logging');
  }
} catch (error) {
  console.log('   ❌ Cannot read supabaseClient.ts');
  hasErrors = true;
}

console.log('');

// 3. Check data stores
console.log('3️⃣ Checking data store implementations...');

const dataStores = [
  'src/foundation/data/LocalDataStore.ts',
  'src/lib/frontendDataStore.ts',
  'src/lib/frontendOnlyDataStore.ts'
];

dataStores.forEach(storePath => {
  try {
    const fullPath = path.join(__dirname, '..', storePath);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${path.basename(storePath)} exists`);
      successes.push(`${path.basename(storePath)} available`);
    } else {
      console.log(`   ❌ ${path.basename(storePath)} missing`);
      hasErrors = true;
    }
  } catch (error) {
    console.log(`   ❌ Error checking ${storePath}`);
    hasErrors = true;
  }
});

console.log('');

// 4. Check bootstrap configuration
console.log('4️⃣ Checking bootstrap logic...');
try {
  const bootstrapPath = path.join(__dirname, '../src/lib/bootstrap.ts');
  const bootstrapContent = fs.readFileSync(bootstrapPath, 'utf-8');

  if (bootstrapContent.includes('Frontend-only mode')) {
    console.log('   ✅ Bootstrap handles frontend-only mode');
    successes.push('Bootstrap configured for frontend-only');
  } else {
    console.log('   ⚠️  Bootstrap may not handle frontend-only properly');
    warnings.push('Review bootstrap.ts for frontend-only configuration');
  }
} catch (error) {
  console.log('   ⚠️  Cannot read bootstrap.ts');
  warnings.push('Verify bootstrap configuration');
}

console.log('');

// 5. Check package.json
console.log('5️⃣ Checking package.json...');
try {
  const packagePath = path.join(__dirname, '../package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

  // Check if @supabase packages exist
  const allDeps = {
    ...packageContent.dependencies,
    ...packageContent.devDependencies
  };

  const supabasePackages = Object.keys(allDeps).filter(pkg =>
    pkg.includes('supabase')
  );

  if (supabasePackages.length > 0) {
    console.log(`   ⚠️  Found ${supabasePackages.length} Supabase package(s):`);
    supabasePackages.forEach(pkg => console.log(`      - ${pkg}`));
    warnings.push('Supabase packages present but unused (can be removed)');
  } else {
    console.log('   ✅ No Supabase packages in dependencies');
    successes.push('Clean dependencies');
  }
} catch (error) {
  console.log('   ⚠️  Cannot read package.json');
  warnings.push('Verify package.json exists');
}

console.log('');

// 6. Check documentation
console.log('6️⃣ Checking documentation...');
const docPath = path.join(__dirname, '../FRONTEND_ONLY_ARCHITECTURE.md');
if (fs.existsSync(docPath)) {
  console.log('   ✅ Frontend-only architecture documentation exists');
  successes.push('Documentation available');
} else {
  console.log('   ⚠️  Architecture documentation missing');
  warnings.push('Create FRONTEND_ONLY_ARCHITECTURE.md');
}

console.log('');
console.log('═'.repeat(60));
console.log('');

// Summary
console.log('📊 VERIFICATION SUMMARY\n');

console.log(`✅ Successes: ${successes.length}`);
successes.forEach(s => console.log(`   • ${s}`));
console.log('');

if (warnings.length > 0) {
  console.log(`⚠️  Warnings: ${warnings.length}`);
  warnings.forEach(w => console.log(`   • ${w}`));
  console.log('');
}

if (hasErrors) {
  console.log('❌ ERRORS FOUND - Frontend-only mode may not work correctly');
  console.log('   Please address the errors above before proceeding.');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('✅ Frontend-only mode is functional but could be improved');
  console.log('   Consider addressing the warnings above.');
  process.exit(0);
} else {
  console.log('✅ Frontend-only configuration is perfect!');
  console.log('   Your application is ready to run without any backend.');
  process.exit(0);
}
