import fs from 'fs';
import path from 'path';
import glob from 'glob';

type MappingEntry = {
  source: string;
  from: string;
  to: string;
  confidence: number;
  regex?: RegExp;
};

type Flags = {
  apply: boolean;
  dry: boolean;
  verbose: boolean;
};

const CONFIDENCE_THRESHOLD = 0.75;
const LOG_PATH = path.resolve('token-migrate.log');

// Artifact A mapping (expand as needed; confidence values reflect draft sheet)
const mappings: MappingEntry[] = [
  // Token objects
  { source: 'twitterTheme', from: 'TWITTER_COLORS.primary', to: 'var(--color-primary)', confidence: 0.96 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.text', to: 'var(--color-text)', confidence: 0.94 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.textSecondary', to: 'var(--color-text-muted)', confidence: 0.94 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.buttonSecondary', to: 'var(--color-panel)', confidence: 0.82 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.buttonSecondaryBorder', to: 'var(--color-border)', confidence: 0.82 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.backgroundPrimary', to: 'var(--color-bg)', confidence: 0.80 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.backgroundSecondary', to: 'var(--color-panel)', confidence: 0.80 },
  { source: 'twitterTheme', from: 'TWITTER_COLORS.shadow', to: 'var(--shadow-md)', confidence: 0.70 },

  { source: 'royalTheme', from: 'ROYAL_COLORS.gold', to: 'var(--color-accent)', confidence: 0.96 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.text', to: 'var(--color-text)', confidence: 0.94 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.muted', to: 'var(--color-text-muted)', confidence: 0.94 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.background', to: 'var(--color-bg)', confidence: 0.90 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.cardBg', to: 'var(--color-panel)', confidence: 0.90 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.border', to: 'var(--color-border)', confidence: 0.90 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.shadowStrong', to: 'var(--shadow-lg)', confidence: 0.82 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.shadow', to: 'var(--shadow-md)', confidence: 0.78 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.primary', to: 'var(--color-primary)', confidence: 0.90 },
  { source: 'royalTheme', from: 'ROYAL_COLORS.secondary', to: 'var(--color-secondary)', confidence: 0.80 },

  // Inline hex colors
  { source: 'hex', from: '#1d9bf0', to: 'var(--color-primary)', confidence: 0.96, regex: /#1d9bf0/gi },
  { source: 'hex', from: '#00b7ff', to: 'var(--color-secondary)', confidence: 0.90, regex: /#00b7ff/gi },
  { source: 'hex', from: '#0b1220', to: 'var(--color-bg)', confidence: 0.96, regex: /#0b1220/gi },
  { source: 'hex', from: '#0f1526', to: 'var(--color-panel)', confidence: 0.92, regex: /#0f1526/gi },
  { source: 'hex', from: '#15202b', to: 'var(--color-bg)', confidence: 0.92, regex: /#15202b/gi },
  { source: 'hex', from: '#192734', to: 'var(--color-panel)', confidence: 0.88, regex: /#192734/gi },
  { source: 'hex', from: '#e7e9ea', to: 'var(--color-text)', confidence: 0.96, regex: /#e7e9ea/gi },
  { source: 'hex', from: '#9ba7b6', to: 'var(--color-text-muted)', confidence: 0.92, regex: /#9ba7b6/gi },
  { source: 'hex', from: '#8899a6', to: 'var(--color-text-muted)', confidence: 0.90, regex: /#8899a6/gi },
  { source: 'hex', from: '#6b7280', to: 'var(--color-text-muted)', confidence: 0.88, regex: /#6b7280/gi },
  { source: 'hex', from: '#22c55e', to: 'var(--color-success)', confidence: 0.94, regex: /#22c55e/gi },
  { source: 'hex', from: '#34c759', to: 'var(--color-success)', confidence: 0.90, regex: /#34c759/gi },
  { source: 'hex', from: '#f59e0b', to: 'var(--color-warning)', confidence: 0.94, regex: /#f59e0b/gi },
  { source: 'hex', from: '#ff9500', to: 'var(--color-warning)', confidence: 0.90, regex: /#ff9500/gi },
  { source: 'hex', from: '#ef4444', to: 'var(--color-danger)', confidence: 0.94, regex: /#ef4444/gi },
  { source: 'hex', from: '#f4212e', to: 'var(--color-danger)', confidence: 0.90, regex: /#f4212e/gi },
  { source: 'hex', from: '#ffd700', to: 'var(--color-accent)', confidence: 0.88, regex: /#ffd700/gi },

  // Inline borders/shadows/radii
  { source: 'border', from: 'rgba(255, 255, 255, 0.08)', to: 'var(--color-border)', confidence: 0.90, regex: /rgba\(255,\s*255,\s*255,\s*0\.0?8\)/gi },
  { source: 'shadow', from: '0 4px 12px rgba(0, 0, 0, 0.15)', to: 'var(--shadow-md)', confidence: 0.86, regex: /0\s+4px\s+12px\s+rgba\(0,\s*0,\s*0,\s*0\.15\)/gi },
  { source: 'shadow', from: '0 8px 24px rgba(0, 0, 0, 0.3)', to: 'var(--shadow-lg)', confidence: 0.86, regex: /0\s+8px\s+24px\s+rgba\(0,\s*0,\s*0,\s*0\.3\)/gi },
  { source: 'radius', from: '4px', to: 'var(--radius-sm)', confidence: 0.86, regex: /4px\b/gi },
  { source: 'radius', from: '6px', to: 'var(--radius-sm)', confidence: 0.90, regex: /6px\b/gi },
  { source: 'radius', from: '8px', to: 'var(--radius-sm)', confidence: 0.90, regex: /8px\b/gi },
  { source: 'radius', from: '10px', to: 'var(--radius-md)', confidence: 0.88, regex: /10px\b/gi },
  { source: 'radius', from: '12px', to: 'var(--radius-md)', confidence: 0.88, regex: /12px\b/gi },
  { source: 'radius', from: '14px', to: 'var(--radius-lg)', confidence: 0.88, regex: /14px\b/gi },
  { source: 'radius', from: '16px', to: 'var(--radius-lg)', confidence: 0.82, regex: /16px\b/gi },
  { source: 'radius', from: '20px', to: 'var(--radius-pill)', confidence: 0.78, regex: /20px\b/gi },
  { source: 'radius', from: '999px', to: 'var(--radius-pill)', confidence: 0.96, regex: /999px\b/gi },
  { source: 'radius', from: '50%', to: 'var(--radius-pill)', confidence: 0.96, regex: /50%\b/gi }
];

function parseFlags(): Flags {
  const args = process.argv.slice(2);
  const flags: Flags = {
    apply: args.includes('--apply'),
    dry: !args.includes('--apply'),
    verbose: args.includes('--verbose')
  };
  return flags;
}

function shouldSkip(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('node_modules/')) return true;
  if (normalized.includes('dist/')) return true;
  if (normalized.includes('.bolt/')) return true;
  if (normalized.includes('supabase/migrations_archive/')) return true;
  return false;
}

function getFiles(): string[] {
  const patterns = ['**/*.ts', '**/*.tsx', '**/*.jsx', '**/*.css'];
  const files: string[] = [];
  patterns.forEach((pattern) => {
    const matches = glob.sync(pattern, { nodir: true, dot: false, ignore: ['**/node_modules/**', '**/dist/**', '**/.bolt/**', '**/supabase/migrations_archive/**'] });
    files.push(...matches);
  });
  return files.filter((f) => !shouldSkip(f));
}

type FileResult = {
  file: string;
  replacements: number;
  skipped: { from: string; reason: string }[];
  unchanged: boolean;
};

function applyMappings(content: string, flags: Flags): { updated: string; replacements: number; skipped: { from: string; reason: string }[] } {
  let updated = content;
  let replacements = 0;
  const skipped: { from: string; reason: string }[] = [];

  for (const m of mappings) {
    if (m.confidence < CONFIDENCE_THRESHOLD) {
      skipped.push({ from: m.from, reason: `below threshold (${m.confidence})` });
      continue;
    }
    const regex = m.regex || new RegExp(escapeRegExp(m.from), 'g');
    const before = updated;
    updated = updated.replace(regex, (match) => {
      replacements += 1;
      if (flags.verbose) {
        logLine(`[REPLACE] ${m.from} -> ${m.to} (conf ${m.confidence})`);
      }
      return m.to;
    });
    if (before === updated && flags.verbose) {
      skipped.push({ from: m.from, reason: 'not found' });
    }
  }

  return { updated, replacements, skipped };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function logLine(line: string) {
  fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
}

function run() {
  const flags = parseFlags();
  // Reset log file
  fs.writeFileSync(LOG_PATH, '', 'utf8');

  const files = getFiles();
  let totalReplacements = 0;
  let totalFilesChanged = 0;

  files.forEach((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { updated, replacements, skipped } = applyMappings(raw, flags);
    const changed = replacements > 0 && updated !== raw;

    const result: FileResult = {
      file,
      replacements,
      skipped,
      unchanged: !changed
    };

    if (replacements > 0) {
      totalReplacements += replacements;
      totalFilesChanged += changed ? 1 : 0;
      logLine(`[FILE] ${file} replacements=${replacements} changed=${changed}`);
    }

    if (flags.apply && changed) {
      fs.writeFileSync(file, updated, 'utf8');
    }
  });

  logLine(`Summary: files=${files.length}, changed=${totalFilesChanged}, replacements=${totalReplacements}, mode=${flags.apply ? 'apply' : 'dry-run'}`);
  if (!flags.apply) {
    console.log('Dry run complete. See token-migrate.log for details. Use --apply to write changes.');
  } else {
    console.log('Apply complete. See token-migrate.log for details.');
  }
}

run();
