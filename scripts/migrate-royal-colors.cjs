#!/usr/bin/env node
/**
 * Automated ROYAL_COLORS Migration Script
 * Replaces all ROYAL_COLORS and ROYAL_STYLES with unified tokens
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Import replacements
  { from: /import\s+{\s*ROYAL_COLORS\s*}\s+from\s+['"]\.\.\/styles\/royalTheme['"]/g, to: "import { tokens } from '../styles/tokens'" },
  { from: /import\s+{\s*ROYAL_COLORS,\s*ROYAL_STYLES\s*}\s+from\s+['"]\.\.\/styles\/royalTheme['"]/g, to: "import { tokens, styles } from '../styles/tokens'" },
  { from: /import\s+{\s*ROYAL_STYLES,\s*ROYAL_COLORS\s*}\s+from\s+['"]\.\.\/styles\/royalTheme['"]/g, to: "import { tokens, styles } from '../styles/tokens'" },
  { from: /import\s+{\s*ROYAL_STYLES\s*}\s+from\s+['"]\.\.\/styles\/royalTheme['"]/g, to: "import { styles } from '../styles/tokens'" },

  // Color replacements - backgrounds
  { from: /ROYAL_COLORS\.background/g, to: 'tokens.colors.background.primary' },
  { from: /ROYAL_COLORS\.backgroundSolid/g, to: 'tokens.colors.background.primary' },
  { from: /ROYAL_COLORS\.backgroundDark/g, to: 'tokens.colors.background.secondary' },
  { from: /ROYAL_COLORS\.card/g, to: 'tokens.colors.background.card' },
  { from: /ROYAL_COLORS\.cardBg/g, to: 'tokens.colors.background.card' },
  { from: /ROYAL_COLORS\.cardHover/g, to: 'tokens.colors.background.cardHover' },
  { from: /ROYAL_COLORS\.secondary/g, to: 'tokens.colors.background.secondary' },
  { from: /ROYAL_COLORS\.secondaryHover/g, to: 'tokens.colors.background.cardHover' },

  // Color replacements - borders
  { from: /ROYAL_COLORS\.cardBorder/g, to: 'tokens.colors.border.default' },
  { from: /ROYAL_COLORS\.cardBorderHover/g, to: 'tokens.colors.border.hover' },
  { from: /ROYAL_COLORS\.border/g, to: 'tokens.colors.border.default' },

  // Color replacements - text
  { from: /ROYAL_COLORS\.text/g, to: 'tokens.colors.text.primary' },
  { from: /ROYAL_COLORS\.textBright/g, to: 'tokens.colors.text.bright' },
  { from: /ROYAL_COLORS\.muted/g, to: 'tokens.colors.text.secondary' },
  { from: /ROYAL_COLORS\.mutedDark/g, to: 'tokens.colors.text.muted' },
  { from: /ROYAL_COLORS\.hint/g, to: 'tokens.colors.text.hint' },

  // Color replacements - brand
  { from: /ROYAL_COLORS\.primary/g, to: 'tokens.colors.brand.primary' },
  { from: /ROYAL_COLORS\.accent/g, to: 'tokens.colors.brand.primary' },
  { from: /ROYAL_COLORS\.accentBright/g, to: 'tokens.colors.brand.primary' },
  { from: /ROYAL_COLORS\.accentDark/g, to: 'tokens.colors.brand.primaryHover' },
  { from: /ROYAL_COLORS\.white/g, to: 'tokens.colors.text.bright' },

  // Color replacements - status
  { from: /ROYAL_COLORS\.gold/g, to: 'tokens.colors.status.warning' },
  { from: /ROYAL_COLORS\.goldBright/g, to: 'tokens.colors.status.warningBright' },
  { from: /ROYAL_COLORS\.crimson/g, to: 'tokens.colors.status.error' },
  { from: /ROYAL_COLORS\.crimsonBright/g, to: 'tokens.colors.status.errorBright' },
  { from: /ROYAL_COLORS\.success/g, to: 'tokens.colors.status.success' },
  { from: /ROYAL_COLORS\.successBright/g, to: 'tokens.colors.status.successBright' },
  { from: /ROYAL_COLORS\.warning/g, to: 'tokens.colors.status.warning' },
  { from: /ROYAL_COLORS\.warningBright/g, to: 'tokens.colors.status.warningBright' },
  { from: /ROYAL_COLORS\.error/g, to: 'tokens.colors.status.error' },
  { from: /ROYAL_COLORS\.errorBright/g, to: 'tokens.colors.status.errorBright' },
  { from: /ROYAL_COLORS\.info/g, to: 'tokens.colors.status.info' },
  { from: /ROYAL_COLORS\.infoBright/g, to: 'tokens.colors.status.infoBright' },

  // Shadows and effects
  { from: /ROYAL_COLORS\.shadow/g, to: 'tokens.shadows.md' },
  { from: /ROYAL_COLORS\.shadowStrong/g, to: 'tokens.shadows.lg' },
  { from: /ROYAL_COLORS\.shadowSoft/g, to: 'tokens.shadows.sm' },

  // Glows
  { from: /ROYAL_COLORS\.glowPurple/g, to: 'tokens.glows.primary' },
  { from: /ROYAL_COLORS\.glowPurpleStrong/g, to: 'tokens.glows.primaryStrong' },
  { from: /ROYAL_COLORS\.glowPrimary/g, to: 'tokens.glows.primary' },
  { from: /ROYAL_COLORS\.glowPrimaryStrong/g, to: 'tokens.glows.primaryStrong' },
  { from: /ROYAL_COLORS\.glowGold/g, to: 'tokens.glows.warning' },
  { from: /ROYAL_COLORS\.glowCrimson/g, to: 'tokens.glows.error' },

  // Gradients
  { from: /ROYAL_COLORS\.gradientPurple/g, to: 'tokens.gradients.primary' },
  { from: /ROYAL_COLORS\.gradientPrimary/g, to: 'tokens.gradients.primary' },
  { from: /ROYAL_COLORS\.gradientGold/g, to: 'tokens.gradients.warning' },
  { from: /ROYAL_COLORS\.gradientCrimson/g, to: 'tokens.gradients.error' },
  { from: /ROYAL_COLORS\.gradientSuccess/g, to: 'tokens.gradients.success' },
  { from: /ROYAL_COLORS\.gradientCard/g, to: 'tokens.gradients.card' },

  // ROYAL_STYLES replacements
  { from: /ROYAL_STYLES\.pageContainer/g, to: 'styles.pageContainer' },
  { from: /ROYAL_STYLES\.pageHeader/g, to: 'styles.pageHeader' },
  { from: /ROYAL_STYLES\.pageTitle/g, to: 'styles.pageTitle' },
  { from: /ROYAL_STYLES\.pageSubtitle/g, to: 'styles.pageSubtitle' },
  { from: /ROYAL_STYLES\.card/g, to: 'styles.card' },
  { from: /ROYAL_STYLES\.cardHover/g, to: 'styles.cardHover' },
  { from: /ROYAL_STYLES\.cardTitle/g, to: 'styles.card' },
  { from: /ROYAL_STYLES\.buttonPrimary/g, to: 'styles.button.primary' },
  { from: /ROYAL_STYLES\.buttonSecondary/g, to: 'styles.button.secondary' },
  { from: /ROYAL_STYLES\.buttonSuccess/g, to: 'styles.button.success' },
  { from: /ROYAL_STYLES\.buttonWarning/g, to: 'styles.button.warning' },
  { from: /ROYAL_STYLES\.buttonDanger/g, to: 'styles.button.danger' },
  { from: /ROYAL_STYLES\.badge/g, to: 'styles.badge.base' },
  { from: /ROYAL_STYLES\.badgeSuccess/g, to: 'styles.badge.success' },
  { from: /ROYAL_STYLES\.badgeWarning/g, to: 'styles.badge.warning' },
  { from: /ROYAL_STYLES\.badgeError/g, to: 'styles.badge.error' },
  { from: /ROYAL_STYLES\.badgeInfo/g, to: 'styles.badge.info' },
  { from: /ROYAL_STYLES\.input/g, to: 'styles.input' },
  { from: /ROYAL_STYLES\.statBox/g, to: 'styles.stat.box' },
  { from: /ROYAL_STYLES\.statValue/g, to: 'styles.stat.value' },
  { from: /ROYAL_STYLES\.statLabel/g, to: 'styles.stat.label' },
  { from: /ROYAL_STYLES\.emptyState/g, to: 'styles.emptyState.container' },
  { from: /ROYAL_STYLES\.emptyStateIcon/g, to: 'styles.emptyState.icon' },
  { from: /ROYAL_STYLES\.emptyStateText/g, to: 'styles.emptyState.text' },
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

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

console.log('🚀 Starting ROYAL_COLORS migration...\n');

const srcDir = path.join(__dirname, '..', 'src');
let migratedCount = 0;

walkDir(srcDir, (filePath) => {
  if (migrateFile(filePath)) {
    migratedCount++;
  }
});

console.log(`\n✨ Migration complete! Migrated ${migratedCount} files.`);
