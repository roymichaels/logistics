#!/bin/bash

# Script to migrate console.error and console.warn to logger.error and logger.warn
# This adds the import if missing and replaces console statements

set -e

echo "🔧 Migrating console statements to logger..."

# List of files to process (excluding main.tsx, logger.ts, and test files)
files=(
  "src/pages/modern/AnalyticsPage.tsx"
  "src/pages/modern/OrderTrackingPage.tsx"
  "src/pages/modern/ProductDetailPage.tsx"
  "src/pages/modern/DriverProfilePage.tsx"
  "src/pages/modern/DeliveryRoutesPage.tsx"
  "src/pages/modern/DeliveryHistoryPage.tsx"
  "src/pages/modern/OrderManagementPage.tsx"
  "src/pages/modern/DriverManagementPage.tsx"
  "src/pages/modern/OrderMarketplacePage.tsx"
  "src/pages/modern/ProductManagementPage.tsx"
  "src/services/localBusinessDataService.ts"
  "src/store/CheckoutPage.tsx"
  "src/store/MyOrdersPage.tsx"
  "src/store/OrderDetailPage.tsx"
  "src/store/SearchPage.tsx"
  "src/pages/CheckoutPage.tsx"
  "src/pages/DriverEarningsPage.tsx"
  "src/pages/BusinessPaymentSettings.tsx"
  "src/pages/PlatformCommissionsPage.tsx"
  "src/pages/customer-service/SupportConsole.tsx"
  "src/api/kyc.ts"
)

count=0

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  Skipping $file (not found)"
    continue
  fi

  echo "📝 Processing $file..."

  # Check if logger is already imported
  if ! grep -q "import.*logger.*from.*lib/logger" "$file"; then
    # Add logger import after the last import statement
    sed -i "/^import/a import { logger } from '@/lib/logger';" "$file" 2>/dev/null || \
    sed -i '' "/^import/a\\
import { logger } from '@/lib/logger';
" "$file"
  fi

  # Replace console.error with logger.error (add context tag)
  sed -i "s/console\.error(/logger.error('[$(basename "$file" .tsx)]', /g" "$file" 2>/dev/null || \
  sed -i '' "s/console\.error(/logger.error('[$(basename "$file" .tsx)]', /g" "$file"

  # Replace console.warn with logger.warn (add context tag)
  sed -i "s/console\.warn(/logger.warn('[$(basename "$file" .tsx)]', /g" "$file" 2>/dev/null || \
  sed -i '' "s/console\.warn(/logger.warn('[$(basename "$file" .tsx)]', /g" "$file"

  ((count++))
done

echo "✅ Migrated $count files successfully!"
echo "🔍 Run 'npm run build' to verify changes"
