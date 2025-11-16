import { z } from 'zod';

// ============================================================================
// User & Authentication Schemas
// ============================================================================

export const userRoleSchema = z.enum([
  'user',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
]);

export const userSchema = z.object({
  id: z.string().uuid(),
  telegram_id: z.string().min(1),
  role: userRoleSchema,
  name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  business_id: z.string().uuid().optional(),
  last_active: z.string().datetime().optional()
});

export const userRegistrationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const registrationApprovalSchema = z.object({
  action: z.enum(['submitted', 'updated', 'approved', 'rejected']),
  by: z.string(),
  at: z.string().datetime(),
  notes: z.string().nullable().optional(),
  assigned_role: userRoleSchema.nullable().optional()
});

export const userRegistrationSchema = z.object({
  telegram_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  department: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  requested_role: userRoleSchema,
  assigned_role: userRoleSchema.nullable().optional(),
  status: userRegistrationStatusSchema,
  approval_history: z.array(registrationApprovalSchema),
  approved_by: z.string().nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  approval_notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================================================
// Business & Organization Schemas
// ============================================================================

export const businessAddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().min(1),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});

export const businessContactInfoSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  support_email: z.string().email().optional(),
  support_phone: z.string().optional()
});

export const businessSettingsSchema = z.object({
  timezone: z.string().optional(),
  language: z.string().optional(),
  date_format: z.string().optional(),
  currency_symbol: z.string().optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  delivery_fee: z.number().min(0).optional(),
  minimum_order_amount: z.number().min(0).optional(),
  max_delivery_distance_km: z.number().positive().optional(),
  operating_hours: z.array(z.object({
    day: z.string(),
    open: z.string(),
    close: z.string()
  })).optional(),
  features: z.object({
    enable_delivery: z.boolean().optional(),
    enable_pickup: z.boolean().optional(),
    enable_scheduling: z.boolean().optional(),
    enable_tracking: z.boolean().optional()
  }).optional()
});

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().optional(),
  owner_id: z.string().uuid(),
  infrastructure_id: z.string().uuid().optional(),
  address: businessAddressSchema.optional(),
  contact_info: businessContactInfoSchema.optional(),
  settings: businessSettingsSchema.optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================================================
// Order & Delivery Schemas
// ============================================================================

export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'assigned',
  'in_transit',
  'delivered',
  'cancelled',
  'failed'
]);

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  total_price: z.number().positive(),
  notes: z.string().optional()
});

export const createOrderInputSchema = z.object({
  business_id: z.string().uuid().optional(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_address: z.string().min(1),
  delivery_notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  total_amount: z.number().positive(),
  scheduled_delivery: z.string().datetime().optional()
});

export const orderSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid().optional(),
  customer_name: z.string(),
  customer_phone: z.string(),
  customer_address: z.string(),
  delivery_notes: z.string().optional(),
  status: orderStatusSchema,
  items: z.array(orderItemSchema),
  total_amount: z.number().positive(),
  assigned_driver_id: z.string().uuid().nullable().optional(),
  scheduled_delivery: z.string().datetime().optional(),
  delivered_at: z.string().datetime().nullable().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================================================
// Inventory Schemas
// ============================================================================

export const inventoryLocationTypeSchema = z.enum([
  'central',
  'warehouse',
  'hub',
  'vehicle',
  'storefront'
]);

export const inventoryLocationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: inventoryLocationTypeSchema,
  description: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
  address_line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().positive(),
  stock_quantity: z.number().int().min(0),
  category: z.string(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  warehouse_location: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const inventoryRecordSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  on_hand_quantity: z.number().int().min(0),
  reserved_quantity: z.number().int().min(0),
  damaged_quantity: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  updated_at: z.string().datetime()
});

export const restockRequestStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'in_transit',
  'received',
  'rejected',
  'cancelled'
]);

export const restockRequestSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  from_location_id: z.string().uuid().optional(),
  to_location_id: z.string().uuid(),
  requested_quantity: z.number().int().positive(),
  approved_quantity: z.number().int().min(0).nullable().optional(),
  status: restockRequestStatusSchema,
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  requested_by: z.string().uuid(),
  approved_by: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================================================
// Driver & Zone Schemas
// ============================================================================

export const driverAvailabilityStatusSchema = z.enum([
  'available',
  'busy',
  'offline',
  'on_break'
]);

export const driverStatusRecordSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  status: driverAvailabilityStatusSchema,
  current_zone_id: z.string().uuid().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  updated_at: z.string().datetime()
});

export const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()])))
});

export const zoneMetadataSchema = z.object({
  area_km2: z.number().positive().optional(),
  population: z.number().int().positive().optional(),
  average_delivery_time_minutes: z.number().positive().optional(),
  peak_hours: z.array(z.string()).optional(),
  notes: z.string().optional(),
  custom_fields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
});

export const zoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  polygon: geoJsonPolygonSchema.optional(),
  center_lat: z.number().optional(),
  center_lng: z.number().optional(),
  radius_km: z.number().positive().optional(),
  is_active: z.boolean(),
  priority: z.number().int().min(0).optional(),
  metadata: zoneMetadataSchema.optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

export function validateDataAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<{ success: true; data: T } | { success: false; errors: z.ZodError }> {
  return schema.parseAsync(data)
    .then(validated => ({ success: true as const, data: validated }))
    .catch(error => {
      if (error instanceof z.ZodError) {
        return { success: false as const, errors: error };
      }
      throw error;
    });
}

// Export type inference helpers
export type User = z.infer<typeof userSchema>;
export type Business = z.infer<typeof businessSchema>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type Product = z.infer<typeof productSchema>;
export type InventoryRecord = z.infer<typeof inventoryRecordSchema>;
export type RestockRequest = z.infer<typeof restockRequestSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type DriverStatusRecord = z.infer<typeof driverStatusRecordSchema>;
