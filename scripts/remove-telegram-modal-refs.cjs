const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/pages/UserManagement.tsx',
  'src/pages/ZoneManagement.tsx',
  'src/components/RoleChangeWorkflow.tsx',
  'src/components/ZoneManager.tsx',
  'src/components/DualModeOrderEntry.tsx',
  'src/migration/MigrationRouter.tsx',
  'src/migration/switchboard.ts',
];

function removeTelegramModalFromFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove TelegramModal import statements
    content = content.replace(/^import\s+\{[^}]*TelegramModal[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');
    content = content.replace(/^import\s+TelegramModal\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

    // Remove TelegramModal component usage (self-closing and with children)
    content = content.replace(/<TelegramModal[^>]*\/>/g, '');
    content = content.replace(/<TelegramModal[^>]*>[\s\S]*?<\/TelegramModal>/g, '');

    // Remove any showTelegramModal state and setter
    content = content.replace(/const\s+\[showTelegramModal,\s*setShowTelegramModal\]\s*=\s*useState[^;]+;/g, '');
    content = content.replace(/setShowTelegramModal\([^)]*\);?/g, '');

    // Remove empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Processed: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

console.log('Starting TelegramModal removal...\n');
filesToProcess.forEach(removeTelegramModalFromFile);
console.log('\nTelegramModal removal complete!');
