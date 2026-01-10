/*
  # Create Subscription System for Business Creation

  1. New Tables
    - `subscription_plans` - Available subscription tiers
      - `id` (uuid, primary key)
      - `name` (text) - Plan name (Free, Starter, Pro, Enterprise)
      - `business_limit` (int) - Max businesses allowed (null = unlimited)
      - `price_monthly` (decimal) - Monthly price
      - `price_yearly` (decimal) - Yearly price
      - `features` (jsonb) - Plan features
      - `active` (boolean)

    - `user_subscriptions` - User subscription status
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `plan_id` (uuid, references subscription_plans)
      - `status` (text) - active, expired, cancelled, trial
      - `current_business_count` (int) - Current number of businesses
      - `payment_status` (text) - paid, pending, failed
      - `trial_ends_at` (timestamptz)
      - `subscription_ends_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read their own subscription
    - Only admins can modify subscriptions

  3. Functions
    - `can_user_create_business(user_id)` - Check if user can create more businesses
    - `get_user_subscription(user_id)` - Get user's current subscription
    - `update_business_count(user_id)` - Update business count after creation

  4. Triggers
    - Auto-update business count when business is created/deleted
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  business_limit int, -- null means unlimited
  price_monthly decimal(10,2) NOT NULL DEFAULT 0,
  price_yearly decimal(10,2) NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
  current_business_count int NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'failed')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, business_limit, price_monthly, price_yearly, features) VALUES
  ('Free', 1, 0, 0, '["1 Business", "Basic Features", "Community Support"]'::jsonb),
  ('Starter', 3, 29.99, 299.90, '["3 Businesses", "Advanced Features", "Email Support", "Analytics"]'::jsonb),
  ('Pro', 10, 79.99, 799.90, '["10 Businesses", "Premium Features", "Priority Support", "Advanced Analytics", "API Access"]'::jsonb),
  ('Enterprise', null, 299.99, 2999.90, '["Unlimited Businesses", "All Features", "24/7 Support", "Custom Integrations", "Dedicated Account Manager"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Function to get user's subscription with plan details
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_name text,
  business_limit int,
  current_business_count int,
  status text,
  can_create_business boolean,
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    sp.name,
    sp.business_limit,
    us.current_business_count,
    us.status,
    CASE
      WHEN sp.business_limit IS NULL THEN true
      WHEN us.current_business_count < sp.business_limit THEN true
      ELSE false
    END AS can_create_business,
    us.trial_ends_at,
    us.subscription_ends_at
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trial');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create business
CREATE OR REPLACE FUNCTION can_user_create_business(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  -- Get user's subscription
  SELECT * INTO v_subscription
  FROM get_user_subscription(p_user_id)
  LIMIT 1;

  -- If no subscription, create free tier subscription
  IF NOT FOUND THEN
    INSERT INTO user_subscriptions (user_id, plan_id, status, trial_ends_at)
    SELECT
      p_user_id,
      id,
      'trial',
      now() + interval '30 days'
    FROM subscription_plans
    WHERE name = 'Free'
    LIMIT 1;

    RETURN true;
  END IF;

  -- Check if subscription is active/trial and within limits
  IF v_subscription.status NOT IN ('active', 'trial') THEN
    RETURN false;
  END IF;

  -- Check business limit
  RETURN v_subscription.can_create_business;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update business count
CREATE OR REPLACE FUNCTION update_user_business_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_subscriptions
    SET
      current_business_count = current_business_count + 1,
      updated_at = now()
    WHERE user_id = NEW.owner_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_subscriptions
    SET
      current_business_count = GREATEST(0, current_business_count - 1),
      updated_at = now()
    WHERE user_id = OLD.owner_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update business count
DROP TRIGGER IF EXISTS update_business_count_trigger ON businesses;
CREATE TRIGGER update_business_count_trigger
  AFTER INSERT OR DELETE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_business_count();

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated, anon
  USING (active = true);

CREATE POLICY "Only admins can modify subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "System can insert subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(active);

COMMENT ON TABLE subscription_plans IS 'Available subscription tiers with business limits and pricing';
COMMENT ON TABLE user_subscriptions IS 'User subscription status and business count tracking';
COMMENT ON FUNCTION can_user_create_business IS 'Checks if user can create more businesses based on subscription limits';
COMMENT ON FUNCTION get_user_subscription IS 'Returns user subscription details with plan information';
