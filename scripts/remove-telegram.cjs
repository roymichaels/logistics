const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/components/AddEquityStakeholderModal.tsx',
  'src/components/BusinessOwnerOnboarding.tsx',
  'src/components/BusinessSettingsModal.tsx',
  'src/components/CustomerOrderPlacement.tsx',
  'src/components/DriverFinancialDashboard.tsx',
  'src/components/DriverOrderFulfillment.tsx',
  'src/components/DriverPerformanceChart.tsx',
  'src/components/FloatingActionButton.tsx',
  'src/components/GroupChannelCreateModal.tsx',
  'src/components/ManagerOrderDashboard.tsx',
  'src/components/orders/ModeSelectorModal.tsx',
  'src/components/orders/OrdersFilters.tsx',
  'src/components/ProfitDistributionModal.tsx',
  'src/components/TeamMemberOnboarding.tsx',
  'src/components/AnalyticsDashboard.tsx',
  'src/components/AppErrorBoundary.tsx',
  'src/components/BecomeDriverModal.tsx',
  'src/components/CreateBusinessModal.tsx',
  'src/components/DriverDetailPanel.tsx',
  'src/components/DualModeOrderEntry.tsx',
  'src/components/EnhancedOrderEntry.tsx',
  'src/components/FinancialDashboard.tsx',
  'src/components/ManagerDashboard.tsx',
  'src/components/ManagerLoginModal.tsx',
  'src/components/ManagerOrdersView.tsx',
  'src/components/OwnerDashboard.tsx',
  'src/components/RightSidebarMenu.tsx',
  'src/components/RoleChangeWorkflow.tsx',
  'src/components/SearchBusinessModal.tsx',
  'src/components/SidebarToggleButton.tsx',
  'src/components/ZoneManager.tsx',
  'src/lib/authService.ts',
  'src/lib/bootstrap.ts',
  'src/pages/AppOwnerAnalytics.tsx',
  'src/pages/Businesses.tsx',
  'src/pages/BusinessPage.tsx',
  'src/pages/Channels.tsx',
  'src/pages/DispatchBoard.tsx',
  'src/pages/DriverDashboard.tsx',
  'src/pages/DriversManagement.new.tsx',
  'src/pages/DriversManagement.tsx',
  'src/pages/MyRole.tsx',
  'src/pages/Notifications.tsx',
  'src/pages/Orders.new.tsx',
  'src/pages/Orders.tsx',
  'src/pages/Products.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Reports.tsx',
  'src/pages/RestockRequests.tsx',
  'src/pages/Tasks.tsx',
  'src/pages/UserHomepage.tsx',
  'src/pages/UserManagement.tsx',
  'src/pages/ZoneManagement.tsx',
  'src/pages/Chat.tsx',
];

function removeTelegramFromFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove telegram import lines
    content = content.replace(/^import\s+\{[^}]*\}\s+from\s+['"].*telegram['"];?\s*$/gm, '');

    // Remove standalone telegram.method() calls (entire line)
    content = content.replace(/^\s*telegram\.[^;]+;?\s*$/gm, '');

    // Remove telegram.method() calls inline (but keep the line)
    content = content.replace(/telegram\.(themeParams|hapticFeedback|showAlert|BackButton|MainButton|expand|ready|close)\([^)]*\)[;,]?/g, '');
    content = content.replace(/telegram\.(themeParams|BackButton|MainButton)[;,]?/g, '');

    // Remove empty lines that were left behind (but preserve intentional spacing)
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Processed: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

console.log('Starting telegram removal...\n');
filesToProcess.forEach(removeTelegramFromFile);
console.log('\nTelegram removal complete!');
