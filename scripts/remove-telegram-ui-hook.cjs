const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/pages/Chat.tsx',
  'src/pages/Reports.tsx',
  'src/pages/RestockRequests.tsx',
  'src/pages/Channels.tsx',
  'src/pages/DispatchBoard.tsx',
  'src/components/ManagerLoginModal.tsx',
  'src/components/GroupChannelCreateModal.tsx',
  'src/components/BusinessManager.tsx',
  'src/components/DriverApplicationForm.tsx',
  'src/components/DriverApplicationReview.tsx',
  'src/components/DriverEarningsDashboard.tsx',
  'src/components/DriverOrderMarketplace.tsx',
  'src/components/FloatingCreateButton.tsx',
  'src/components/NotificationPreferences.tsx',
  'src/pages/FreelancerDriverDashboard.tsx',
  'src/components/BottomNavigation.tsx',
  'src/components/BusinessTypeManager.tsx',
  'src/components/DashboardWidgets.tsx',
  'src/components/EncryptedChat.tsx',
  'src/components/ImageUpload.tsx',
  'src/components/OrderCreationWizard.tsx',
  'src/components/PINEntry.tsx',
  'src/components/RoutePlanner.tsx',
  'src/components/SecurityGate.tsx',
  'src/components/TaskProofSubmission.tsx',
  'src/components/UserListView.tsx',
  'src/components/UserProfileModal.tsx',
  'src/pages/AdminPanel.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/DriverStatus.tsx',
  'src/pages/Incoming.tsx',
  'src/pages/Inventory.tsx',
  'src/pages/Logs.tsx',
  'src/pages/ManagerInventory.tsx',
  'src/pages/MyDeliveries.tsx',
  'src/pages/MyInventory.tsx',
  'src/pages/MyStats.tsx',
  'src/pages/MyZones.tsx',
  'src/pages/WarehouseDashboard.tsx',
];

function removeUseTelegramUIFromFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove useTelegramUI import
    content = content.replace(/^import\s+\{[^}]*useTelegramUI[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

    // Remove standalone const { ... } = useTelegramUI() declarations
    content = content.replace(/^\s*const\s+\{[^}]*\}\s*=\s*useTelegramUI\(\);?\s*$/gm, '');

    // Remove references in variable destructuring
    content = content.replace(/const\s+\{([^}]*,\s*)?([^,}]*)\s*\}\s*=\s*useTelegramUI\(\)/g, '');

    // Remove empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Processed: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

console.log('Starting useTelegramUI removal...\n');
filesToProcess.forEach(removeUseTelegramUIFromFile);
console.log('\nuseTelegramUI removal complete!');
