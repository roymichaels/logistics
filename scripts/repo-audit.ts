import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type Category = 'KEEP' | 'DELETE' | 'MERGE' | 'MIGRATE' | 'AMBIGUOUS';

type Ruleset = {
  keep: RegExp[];
  del: RegExp[];
  merge: RegExp[];
  migrate: RegExp[];
};

const rules: Ruleset = {
  keep: [
    /^src\/pages_migration\//,
    /^src\/adapters\/ui\//,
    /^src\/components\/primitives\//,
    /^src\/migration\//,
    /^src\/hooks\/usePageTitle\.ts$/,
    /^src\/hooks\/useResponsiveHeader\.ts$/,
    /^src\/styles\/canonical-tokens\.css$/,
    /^src\/context\//,
    /^src\/lib\/supabaseDataStore\.ts$/,
    /^src\/lib\/frontendDataStore\.ts$/
  ],
  del: [
    /^src\/styles\/twitterTheme\.ts$/,
    /^src\/styles\/royalTheme\.ts$/,
    /^src\/styles\/header\.css$/,
    /^src\/styles\/storefront-theme\.css$/,
    /^src\/theme\/telegramx\//,
    /^src\/theme\/swiss\//,
    /^src\/pages\/kyc\//,
    /^src\/store\/ProductCard\.tsx$/,
    /^src\/store\/CategoryTabs\.tsx$/,
    /^src\/store\/CartDrawer\.tsx$/,
    /^src\/.*BusinessContextSelector\.tsx$/,
    /^src\/.*BusinessContextSwitcher\.tsx$/,
    /^src\/.*EnhancedContextSwitcher\.tsx$/
  ],
  merge: [
    /^src\/components\/Header\.tsx$/,
    /^src\/shells\/StoreShell\.tsx$/,
    /^src\/shells\/BusinessShell\.tsx$/,
    /^src\/shells\/DriverShell\.tsx$/,
    /^src\/components\/.*popover.*\.tsx$/,
    /^src\/components\/.*dropdown.*\.tsx$/,
    /^src\/components\/.*modal.*\.tsx$/,
    /^src\/components\/.*drawer.*\.tsx$/,
    /^src\/pages\/kyc\//,
    /^src\/store\/.*\.tsx$/,
    /^src\/pages\/Product\.tsx$/
  ],
  migrate: [
    /^src\/.*dataStore.*\.tsx?$/,
    /^src\/components\/.*css$/,
    /^src\/pages\//,
    /^src\/layouts\//,
    /^src\/.*tokens.*\.tsx?$/,
    /^src\/.*theme.*\.tsx?$/
  ]
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');
const outputFile = path.join(root, 'audit-results.json');

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return [full];
  });
}

function classify(relativePath: string): Category {
  // Normalize to forward slashes
  const rel = relativePath.replace(/\\/g, '/');

  for (const rx of rules.keep) {
    if (rx.test(rel)) return 'KEEP';
  }
  for (const rx of rules.del) {
    if (rx.test(rel)) return 'DELETE';
  }
  for (const rx of rules.merge) {
    if (rx.test(rel)) return 'MERGE';
  }
  for (const rx of rules.migrate) {
    if (rx.test(rel)) return 'MIGRATE';
  }
  return 'AMBIGUOUS';
}

function main() {
  const files = walk(srcRoot);
  const result: Record<Category, Record<string, string>> = {
    KEEP: {},
    DELETE: {},
    MERGE: {},
    MIGRATE: {},
    AMBIGUOUS: {}
  };

  files.forEach((f) => {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const category = classify(rel);
    switch (category) {
      case 'KEEP':
        result.KEEP[rel] = 'Matches migration/keep rule';
        break;
      case 'DELETE':
        result.DELETE[rel] = 'Matches legacy/delete rule (post-migration cleanup)';
        break;
      case 'MERGE':
        result.MERGE[rel] = 'Should fold into migration equivalent';
        break;
      case 'MIGRATE':
        result.MIGRATE[rel] = 'Still referenced; migrate to new structure';
        break;
      default:
        result.AMBIGUOUS[rel] = 'No rule matched; needs review';
    }
  });

  const summary = Object.fromEntries(
    (Object.keys(result) as Category[]).map((k) => [k, Object.keys(result[k]).length])
  );

  const payload = { summary, files: result };
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2), 'utf-8');
  console.log('Audit complete. Output ->', outputFile);
  console.log('Summary:', summary);
}

main();
