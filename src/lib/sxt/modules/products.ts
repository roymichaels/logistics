import { sxtExecute, sxtQuery } from '../client';
import type { Product } from '../../data/types';

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    name: 'מחשב נייד Dell',
    sku: 'DELL-001',
    price: 3500,
    stock_quantity: 25,
    category: 'מחשבים',
    description: 'מחשב נייד Dell Inspiron 15',
    warehouse_location: 'מחסן א - מדף 1',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'demo-2',
    name: 'עכבר אלחוטי',
    sku: 'MOUSE-001',
    price: 120,
    stock_quantity: 150,
    category: 'אביזרים',
    description: 'עכבר אלחוטי Logitech',
    warehouse_location: 'מחסן ב - מדף 3',
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  },
  {
    id: 'demo-3',
    name: 'סט אוזניות גיימינג',
    sku: 'HEADSET-777',
    price: 420,
    stock_quantity: 60,
    category: 'דיגיטל',
    description: 'אוזניות עם מיקרופון ביטול רעשים',
    warehouse_location: 'מחסן ב - מדף 4',
    created_at: '2024-02-02T08:30:00Z',
    updated_at: '2024-02-02T08:30:00Z'
  },
  {
    id: 'demo-4',
    name: 'כרטיס מתנה דיגיטלי',
    sku: 'GIFT-100',
    price: 100,
    stock_quantity: 999,
    category: 'מבצעים',
    description: 'כרטיס מתנה נטען ללקוחות',
    warehouse_location: 'דיגיטלי בלבד',
    created_at: '2024-02-03T11:00:00Z',
    updated_at: '2024-02-03T11:00:00Z'
  },
  {
    id: 'demo-5',
    name: 'שירות התקנה בבית לקוח',
    sku: 'SERVICE-INSTALL',
    price: 250,
    stock_quantity: 999,
    category: 'שירותים',
    description: 'טכנאי מגיע ומתקין ציוד',
    warehouse_location: 'שירות חיצוני',
    created_at: '2024-02-04T09:15:00Z',
    updated_at: '2024-02-04T09:15:00Z'
  },
  {
    id: 'demo-6',
    name: 'מדפסת לייזר קומפקטית',
    sku: 'PRT-LZR-12',
    price: 820,
    stock_quantity: 35,
    category: 'פיזי',
    description: 'מדפסת לייזר מהירה לחיסכון בדפים',
    warehouse_location: 'מחסן א - מדף 7',
    created_at: '2024-02-05T10:45:00Z',
    updated_at: '2024-02-05T10:45:00Z'
  },
  {
    id: 'demo-7',
    name: 'מסך 27\" 2K',
    sku: 'MON-27QHD',
    price: 1290,
    stock_quantity: 18,
    category: 'חדש',
    description: 'מסך QHD עם קצב רענון 144Hz',
    warehouse_location: 'מחסן ג - מדף 2',
    created_at: '2024-02-06T12:10:00Z',
    updated_at: '2024-02-06T12:10:00Z'
  },
  {
    id: 'demo-8',
    name: 'נתב Mesh מהיר',
    sku: 'ROUTER-MSH',
    price: 640,
    stock_quantity: 42,
    category: 'חם',
    description: 'כיסוי Wi‑Fi מלא לבית או למשרד',
    warehouse_location: 'מחסן ג - מדף 5',
    created_at: '2024-02-07T07:50:00Z',
    updated_at: '2024-02-07T07:50:00Z'
  }
];

function fallbackProducts(): Product[] {
  return DEMO_PRODUCTS.map(p => ({ ...p }));
}

export async function listProducts(): Promise<Product[]> {
  try {
    const rows = await sxtQuery<Product>('SELECT * FROM products ORDER BY created_at DESC;');
    if (!rows || rows.length === 0) {
      return fallbackProducts();
    }
    return rows;
  } catch (error) {
    console.warn('SxT listProducts failed, serving demo products:', error);
    return fallbackProducts();
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const rows = await sxtQuery<Product>('SELECT * FROM products WHERE id = $1 LIMIT 1;', [id]);
    if (rows[0]) return rows[0];
  } catch (error) {
    console.warn('SxT getProduct failed, falling back to demo products:', error);
  }

  const demo = fallbackProducts().find(p => p.id === id);
  return demo ?? null;
}

export async function createProduct(input: Partial<Product>): Promise<Product> {
  const {
    id,
    name,
    description,
    image_url,
    price,
    stock_quantity,
    category,
    warehouse_location
  } = input;

  const productId = id || crypto.randomUUID();
  await sxtExecute(
    `
    INSERT INTO products (
      id, name, description, image_url, price, stock_quantity, category, warehouse_location, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
    );
    `,
    [
      productId,
      name ?? null,
      description ?? null,
      image_url ?? null,
      price ?? null,
      stock_quantity ?? null,
      category ?? null,
      warehouse_location ?? null
    ]
  );

  const created = await getProduct(productId);
  if (!created) {
    throw new Error('Failed to create product');
  }
  return created;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const entries = Object.entries(patch ?? {}).filter(([, v]) => v !== undefined);
  entries.forEach(([key, value], idx) => {
    fields.push(`${key} = $${idx + 1}`);
    values.push(value);
  });

  if (fields.length === 0) {
    const existing = await getProduct(id);
    if (!existing) throw new Error('Product not found');
    return existing;
  }

  // Add updated_at
  fields.push(`updated_at = $${fields.length + 1}`);
  values.push(new Date().toISOString());

  // Add id as final param
  values.push(id);

  await sxtExecute(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${fields.length + 1};`,
    values
  );

  const updated = await getProduct(id);
  if (!updated) {
    throw new Error('Failed to update product');
  }
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  await sxtExecute('DELETE FROM products WHERE id = $1;', [id]);
}
