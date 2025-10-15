export const LEGACY_TO_CANONICAL_ROLE: Record<string, string> = {
  owner: 'business_owner',
  business_owner: 'business_owner',
  manager: 'manager',
  dispatcher: 'dispatcher',
  driver: 'driver',
  warehouse: 'warehouse',
  sales: 'sales',
  customer_service: 'customer_service',
};

export const CANONICAL_TO_LEGACY_ROLE: Record<string, string> = Object.entries(
  LEGACY_TO_CANONICAL_ROLE
).reduce((acc, [legacy, canonical]) => {
  if (!acc[canonical]) {
    acc[canonical] = legacy;
  }
  return acc;
}, {} as Record<string, string>);
