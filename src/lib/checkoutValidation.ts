import { z } from 'zod';
import { logger } from './logger';

export const deliveryAddressSchema = z.object({
  street: z.string().min(3, 'Street address must be at least 3 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  delivery_instructions: z.string().max(500).optional(),
});

export const contactInfoSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const cartItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  product_name: z.string().min(1),
  product_image: z.string().optional(),
});

export const checkoutSchema = z.object({
  business_id: z.string().uuid('Invalid business ID'),
  delivery_address: deliveryAddressSchema,
  contact_info: contactInfoSchema,
  items: z.array(cartItemSchema).min(1, 'Cart must contain at least one item'),
  delivery_method: z.enum(['standard', 'express', 'scheduled']),
  scheduled_delivery_time: z.string().datetime().optional(),
  payment_method: z.enum(['cash', 'card', 'wallet']),
  notes: z.string().max(1000).optional(),
});

export type CheckoutData = z.infer<typeof checkoutSchema>;
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: CheckoutData;
}

export class CheckoutValidator {
  static validate(data: unknown): ValidationResult {
    try {
      const validated = checkoutSchema.parse(data);

      const businessRules = this.validateBusinessRules(validated);

      if (businessRules.length > 0) {
        return {
          valid: false,
          errors: businessRules,
        };
      }

      return {
        valid: true,
        errors: [],
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return {
          valid: false,
          errors,
        };
      }

      logger.error('[CheckoutValidator] Unexpected validation error', error);

      return {
        valid: false,
        errors: [
          {
            field: 'unknown',
            message: 'An unexpected validation error occurred',
          },
        ],
      };
    }
  }

  private static validateBusinessRules(data: CheckoutData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.delivery_method === 'scheduled' && !data.scheduled_delivery_time) {
      errors.push({
        field: 'scheduled_delivery_time',
        message: 'Scheduled delivery time is required for scheduled delivery',
      });
    }

    if (data.scheduled_delivery_time) {
      const scheduledTime = new Date(data.scheduled_delivery_time);
      const now = new Date();

      if (scheduledTime < now) {
        errors.push({
          field: 'scheduled_delivery_time',
          message: 'Scheduled delivery time must be in the future',
        });
      }

      const maxAdvanceBooking = new Date();
      maxAdvanceBooking.setDate(maxAdvanceBooking.getDate() + 30);

      if (scheduledTime > maxAdvanceBooking) {
        errors.push({
          field: 'scheduled_delivery_time',
          message: 'Scheduled delivery cannot be more than 30 days in advance',
        });
      }
    }

    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > 100) {
      errors.push({
        field: 'items',
        message: 'Total quantity cannot exceed 100 items',
      });
    }

    const totalPrice = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (totalPrice <= 0) {
      errors.push({
        field: 'items',
        message: 'Order total must be greater than zero',
      });
    }

    if (totalPrice > 10000) {
      errors.push({
        field: 'items',
        message: 'Order total cannot exceed 10,000 (contact support for large orders)',
      });
    }

    return errors;
  }

  static validateAddress(address: unknown): { valid: boolean; errors: ValidationError[] } {
    try {
      deliveryAddressSchema.parse(address);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return { valid: false, errors };
      }
      return {
        valid: false,
        errors: [{ field: 'unknown', message: 'Invalid address format' }],
      };
    }
  }

  static validateContactInfo(contact: unknown): { valid: boolean; errors: ValidationError[] } {
    try {
      contactInfoSchema.parse(contact);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return { valid: false, errors };
      }
      return {
        valid: false,
        errors: [{ field: 'unknown', message: 'Invalid contact information' }],
      };
    }
  }

  static calculateTotals(items: CartItem[]): {
    subtotal: number;
    itemCount: number;
    uniqueProducts: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueProducts = items.length;

    return {
      subtotal,
      itemCount,
      uniqueProducts,
    };
  }

  static estimateDeliveryTime(deliveryMethod: 'standard' | 'express' | 'scheduled'): number {
    switch (deliveryMethod) {
      case 'express':
        return 30; // 30 minutes
      case 'standard':
        return 60; // 60 minutes
      case 'scheduled':
        return 0; // User-specified
      default:
        return 60;
    }
  }
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  if (errors.length === 1) {
    return errors[0].message;
  }

  return errors.map((err) => `• ${err.message}`).join('\n');
}

export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find((err) => err.field === field || err.field.startsWith(field + '.'));
  return error ? error.message : null;
}
