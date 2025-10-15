#!/usr/bin/env bash
set -euo pipefail

echo "\nℹ️  deploy-to-supabase.sh is deprecated."
echo "   Run the Supabase CLI commands instead:"
echo "     npx supabase login"
echo "     npx supabase link --project-ref <project-ref>"
echo "     npx supabase db reset"
echo "     npx supabase db diff"
echo "\nRefer to DEPLOY_INSTRUCTIONS.md for details on the consolidated baseline workflow."
