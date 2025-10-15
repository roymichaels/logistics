const VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quoteIdent(name) {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

function buildPolicyNames(table) {
  return {
    select: `Tenant access (${table}) select`,
    modify: `Tenant access (${table}) modify`,
    anon: `Anon blocked (${table})`,
    service: `Service role (${table}) bypass`
  };
}

function resolveScope(config) {
  if (config.scope) {
    return config.scope;
  }
  return config.businessColumn ? 'business' : 'infrastructure';
}

export function buildTenantPolicyStatements(config) {
  if (!config?.table) {
    throw new Error('table is required');
  }
  if (!config.infrastructureColumn) {
    throw new Error('infrastructureColumn is required');
  }

  const scope = resolveScope(config);
  const table = config.table;
  const infraColumn = quoteIdent(config.infrastructureColumn);
  const policyNames = buildPolicyNames(table);

  let businessColumnSql = 'NULL';
  if (config.businessColumn) {
    businessColumnSql = quoteIdent(config.businessColumn);
  }

  let usingCondition;
  if (scope === 'infrastructure') {
    usingCondition = `public.tenant_can_access_infrastructure(${infraColumn})`;
  } else {
    usingCondition = `public.tenant_can_access(${infraColumn}, ${businessColumnSql})`;
  }

  let checkCondition = usingCondition;
  if (config.requireManager) {
    if (scope === 'infrastructure') {
      checkCondition = `public.tenant_can_access_infrastructure(${infraColumn})`;
    } else {
      checkCondition = `public.tenant_can_manage_business(${infraColumn}, ${businessColumnSql})`;
    }
  }

  const selectPolicy = `create policy "${policyNames.select}" on public.${table} for select to authenticated using (${usingCondition});`;
  const modifyPolicy = `create policy "${policyNames.modify}" on public.${table} for all to authenticated using (${checkCondition}) with check (${checkCondition});`;
  const anonPolicy = `create policy "${policyNames.anon}" on public.${table} for select to anon using (false);`;
  const servicePolicy = `create policy "${policyNames.service}" on public.${table} for all to service_role using (true) with check (true);`;

  return {
    scope,
    usingCondition,
    checkCondition,
    policyNames,
    dropStatements: [
      `drop policy if exists "${policyNames.select}" on public.${table};`,
      `drop policy if exists "${policyNames.modify}" on public.${table};`,
      `drop policy if exists "${policyNames.anon}" on public.${table};`,
      `drop policy if exists "${policyNames.service}" on public.${table};`
    ],
    createStatements: [selectPolicy, modifyPolicy, anonPolicy, servicePolicy]
  };
}

export function generateTenantPolicySql(configs) {
  if (!Array.isArray(configs)) {
    throw new Error('configs must be an array');
  }

  const statements = [];
  for (const config of configs) {
    const result = buildTenantPolicyStatements(config);
    statements.push(...result.dropStatements, ...result.createStatements);
  }
  return statements.join('\n');
}

export default {
  buildTenantPolicyStatements,
  generateTenantPolicySql
};
