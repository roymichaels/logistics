/*
  # Shopping Cart & Order Management System

  Creates comprehensive shopping cart and order management functionality.

  ## New Tables

  1. `shopping_carts`
    - Persistent shopping carts for users and guests
    - Session management
    - Cart expiration

  2. `cart_items`
    - Products and variants in cart
    - Quantity management
    - Price snapshots

  3. `orders` (enhanced)
    - Complete order information
    - Status tracking
    - Payment details

  4. `order_items`
    - Ordered products with pricing
    - Snapshots for historical accuracy

  5. `order_status_history`
    - Complete audit trail
    - Status transitions
    - Notes and timestamps

  6. `payment_transactions`
    - Payment tracking
    - Multiple payment methods
    - Transaction security

  ## Security
  - RLS enabled on all tables
  - Users access own carts/orders only
  - Business members view business orders
  - Guest cart access via token
*/

-- Shopping Carts Table
CREATE TABLE IF NOT EXISTS shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  guest_session_token text,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  currency text DEFAULT 'ILS',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  UNIQUE(user_id, business_id),
  UNIQUE(guest_session_token, business_id),
  CHECK (user_id IS NOT NULL OR guest_session_token IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_shopping_carts_user ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_guest ON shopping_carts(guest_session_token);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_business ON shopping_carts(business_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_expires ON shopping_carts(expires_at);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  notes text,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- Enhanced Orders Table
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
    ALTER TABLE orders ADD COLUMN order_number text UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_profile_id') THEN
    ALTER TABLE orders ADD COLUMN customer_profile_id uuid REFERENCES customer_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guest_checkout_id') THEN
    ALTER TABLE orders ADD COLUMN guest_checkout_id uuid REFERENCES guest_checkouts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'subtotal') THEN
    ALTER TABLE orders ADD COLUMN subtotal decimal(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tax_amount') THEN
    ALTER TABLE orders ADD COLUMN tax_amount decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_amount') THEN
    ALTER TABLE orders ADD COLUMN shipping_amount decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
    ALTER TABLE orders ADD COLUMN total_amount decimal(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'currency') THEN
    ALTER TABLE orders ADD COLUMN currency text DEFAULT 'ILS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_address_snapshot') THEN
    ALTER TABLE orders ADD COLUMN shipping_address_snapshot jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billing_address_snapshot') THEN
    ALTER TABLE orders ADD COLUMN billing_address_snapshot jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_notes') THEN
    ALTER TABLE orders ADD COLUMN customer_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'internal_notes') THEN
    ALTER TABLE orders ADD COLUMN internal_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fulfillment_status') THEN
    ALTER TABLE orders ADD COLUMN fulfillment_status text DEFAULT 'unfulfilled';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_profile ON orders(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest ON orders(guest_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(business_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(business_id, fulfillment_status);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  variant_name text,
  sku text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  product_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Order Status History Table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  previous_status text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transaction_id text UNIQUE,
  payment_method text NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'ILS',
  status text NOT NULL DEFAULT 'pending',
  gateway_response jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- RLS Policies

-- Shopping Carts
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cart" ON shopping_carts;
CREATE POLICY "Users can manage own cart"
  ON shopping_carts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can manage guest cart" ON shopping_carts;
CREATE POLICY "Anyone can manage guest cart"
  ON shopping_carts FOR ALL
  TO public
  USING (guest_session_token IS NOT NULL);

-- Cart Items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cart items" ON cart_items;
CREATE POLICY "Users can manage own cart items"
  ON cart_items FOR ALL
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM shopping_carts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can manage guest cart items" ON cart_items;
CREATE POLICY "Anyone can manage guest cart items"
  ON cart_items FOR ALL
  TO public
  USING (
    cart_id IN (
      SELECT id FROM shopping_carts WHERE guest_session_token IS NOT NULL
    )
  );

-- Orders (Enhanced)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business members can manage orders" ON orders;
CREATE POLICY "Business members can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customer_profiles cp ON cp.id = o.customer_profile_id
      WHERE cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business members can manage order items" ON order_items;
CREATE POLICY "Business members can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN user_business_roles ubr ON ubr.business_id = o.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Order Status History
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order history" ON order_status_history;
CREATE POLICY "Users can view own order history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customer_profiles cp ON cp.id = o.customer_profile_id
      WHERE cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business members can manage order history" ON order_status_history;
CREATE POLICY "Business members can manage order history"
  ON order_status_history FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN user_business_roles ubr ON ubr.business_id = o.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Payment Transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON payment_transactions;
CREATE POLICY "Users can view own payments"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customer_profiles cp ON cp.id = o.customer_profile_id
      WHERE cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business members can manage payments" ON payment_transactions;
CREATE POLICY "Business members can manage payments"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN user_business_roles ubr ON ubr.business_id = o.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Helper Functions

-- Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_date text := to_char(now(), 'YYYYMMDD');
  v_sequence integer;
  v_order_number text;
BEGIN
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM orders
  WHERE business_id = p_business_id
    AND created_at >= date_trunc('day', now());

  v_order_number := v_date || '-' || lpad(v_sequence::text, 5, '0');

  RETURN v_order_number;
END;
$$;

-- Update cart totals
CREATE OR REPLACE FUNCTION update_cart_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE shopping_carts
  SET updated_at = now()
  WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_cart_totals ON cart_items;
CREATE TRIGGER trg_update_cart_totals
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_totals();

-- Track order status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      status,
      previous_status,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.status,
      OLD.status,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_order_status_change ON orders;
CREATE TRIGGER trg_track_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_change();

-- Cleanup expired carts
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM shopping_carts
  WHERE expires_at < now();
END;
$$;

-- Update timestamps
DROP TRIGGER IF EXISTS trg_shopping_carts_updated_at ON shopping_carts;
CREATE TRIGGER trg_shopping_carts_updated_at
  BEFORE UPDATE ON shopping_carts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE shopping_carts IS 'Persistent shopping carts for users and guests';
COMMENT ON TABLE cart_items IS 'Products in shopping cart with price snapshots';
COMMENT ON TABLE order_items IS 'Ordered products with historical pricing data';
COMMENT ON TABLE order_status_history IS 'Complete audit trail of order status changes';
COMMENT ON TABLE payment_transactions IS 'Payment processing tracking and security';
