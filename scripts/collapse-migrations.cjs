#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(path.join(__dirname, '..'));
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const ARCHIVE_DIR = path.join(ROOT, 'supabase', 'migrations_archive');
const DUMP_PATH = path.join(ROOT, 'supabase', 'schema_dump.sql');

function parseArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return null;
}

const stampArg = parseArg('--stamp');
const stamp = stampArg || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const baselineName = `${stamp}_000000_init.sql`;
const baselinePath = path.join(MIGRATIONS_DIR, baselineName);

function run(command) {
  console.log(`→ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

try {
  run(`npx supabase db dump -f ${JSON.stringify(DUMP_PATH)} --linked`);
} catch (error) {
  console.error('\n❌ Failed to dump schema. Ensure SUPABASE_ACCESS_TOKEN is set and the project is linked.');
  process.exit(1);
}

fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

const entries = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql') && file !== path.basename(baselinePath));

const archived = [];
for (const file of entries) {
  if (file.includes('_seed_')) {
    continue;
  }
  const source = path.join(MIGRATIONS_DIR, file);
  const target = path.join(ARCHIVE_DIR, file);
  fs.renameSync(source, target);
  archived.push(file);
}

fs.renameSync(DUMP_PATH, baselinePath);

console.log(`\n✅ Baseline regenerated: ${baselineName}`);
if (archived.length) {
  console.log('📦 Archived migrations:');
  archived.forEach((file) => console.log(`   - ${file}`));
} else {
  console.log('📦 No previous migrations were archived (only seeds remained).');
}

console.log('\nℹ️ Seed files (matching *_seed_*.sql) were left untouched.');
console.log('   Review supabase/migrations/ to ensure canonical role and infrastructure seeds still reflect production data.');
