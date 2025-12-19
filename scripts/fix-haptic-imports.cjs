/**
 * Script to add haptic import to all files that use it
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files that need haptic import
const filesToFix = [
  'src/pages/Chat.tsx',
  'src/pages/MyZones.tsx',
  'src/pages/Reports.tsx',
  'src/pages/Channels.tsx',
  'src/pages/AdminPanel.tsx',
  'src/pages/MyInventory.tsx',
  'src/pages/DriverStatus.tsx',
  'src/pages/MyDeliveries.tsx',
  'src/pages/DispatchBoard.tsx',
  'src/pages/FreelancerDriverDashboard.tsx',
  'src/components/PINEntry.tsx',
  'src/components/ImageUpload.tsx',
  'src/components/RoutePlanner.tsx',
  'src/components/SecurityGate.tsx',
  'src/components/UserListView.tsx',
  'src/components/EncryptedChat.tsx',
  'src/components/BusinessManager.tsx',
  'src/components/BottomNavigation.tsx',
  'src/components/DashboardWidgets.tsx',
  'src/components/UserProfileModal.tsx',
  'src/components/ManagerLoginModal.tsx',
  'src/components/BusinessTypeManager.tsx',
  'src/components/OrderCreationWizard.tsx',
  'src/components/TaskProofSubmission.tsx',
  'src/components/FloatingCreateButton.tsx',
  'src/components/GroupChannelCreateModal.tsx',
  'src/components/NotificationPreferences.tsx',
  'src/components/DriverApplicationForm.tsx',
  'src/components/DriverApplicationReview.tsx',
  'src/components/DriverOrderMarketplace.tsx',
  'src/components/chat/ChatCreateMenu.tsx',
  'src/components/chat/ChatHeader.tsx',
];

const projectRoot = path.resolve(__dirname, '..');

function fixFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Check if haptic is already imported
    if (content.includes("from '../utils/haptic'") || content.includes('from "../utils/haptic"')) {
      console.log(`✓ ${filePath} - already has haptic import`);
      return false;
    }

    // Check if file uses haptic
    if (!content.includes('haptic(')) {
      console.log(`✓ ${filePath} - doesn't use haptic`);
      return false;
    }

    // Find the last import statement
    const importRegex = /^import\s+.*?;$/gm;
    const imports = content.match(importRegex);

    if (!imports || imports.length === 0) {
      console.warn(`⚠️  ${filePath} - no imports found`);
      return false;
    }

    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;

    // Determine the correct relative path
    const depth = filePath.split('/').length - 2; // -2 because we start from src/
    const relativePath = '../'.repeat(depth) + 'utils/haptic';

    // Insert the haptic import
    const newImport = `\nimport { haptic } from '${relativePath}';`;
    content = content.slice(0, insertPosition) + newImport + content.slice(insertPosition);

    // Write back
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath} - added haptic import`);
    return true;
  } catch (error) {
    console.error(`❌ ${filePath} - error:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing haptic imports...\n');

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const file of filesToFix) {
  const result = fixFile(file);
  if (result === true) fixed++;
  else if (result === false) skipped++;
  else errors++;
}

console.log(`\n✨ Done!`);
console.log(`   Fixed: ${fixed}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Errors: ${errors}`);
