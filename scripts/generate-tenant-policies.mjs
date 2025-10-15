#!/usr/bin/env node
import { generateTenantPolicySql } from './tenantPolicyTemplates.mjs';

const exampleConfigs = [
  {
    table: 'businesses',
    infrastructureColumn: 'infrastructure_id',
    businessColumn: 'id'
  }
];

const args = process.argv.slice(2);
let configs;

if (args.length) {
  try {
    configs = JSON.parse(args[0]);
    if (!Array.isArray(configs)) {
      throw new Error('Parsed value is not an array');
    }
  } catch (error) {
    console.error('Failed to parse configuration JSON.');
    console.error('Provide an array of configuration objects.');
    console.error(error.message);
    process.exit(1);
  }
} else {
  configs = exampleConfigs;
  console.warn('No configuration supplied. Using example configuration for businesses table.');
  console.warn('Usage: node scripts/generate-tenant-policies.mjs "[ { \"table\": \"orders\", ... } ]"');
}

const sql = generateTenantPolicySql(configs);
process.stdout.write(`${sql}\n`);
