#!/usr/bin/env bash
set -euo pipefail

echo "\nℹ️  deploy-to-supabase.sh is deprecated."
echo "   Apply the lean baseline SQL files manually:"
echo "     psql \"\$DATABASE_URL\" -f supabase/init_schema.sql"
echo "     psql \"\$DATABASE_URL\" -f supabase/seed_data.sql"
echo "\nRefer to DEPLOY_INSTRUCTIONS.md for details on the new workflow."
