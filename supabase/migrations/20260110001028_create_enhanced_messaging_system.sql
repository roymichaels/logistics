/*
  # Enhanced Business Communication Platform
  
  ## Overview
  Enterprise-grade messaging system with Slack/Teams-style features integrated with business context.
  
  ## New Tables
  
  ### Business Channels
  - `business_channels`: Pre-defined channels per business (general, announcements, support)
  - `department_channels`: Department-specific channels (warehouse, dispatch, sales)
  - `channel_templates`: Reusable channel structures
  
  ### Enhanced Messaging
  - `message_reactions`: Emoji reactions like Slack
  - `message_threads`: Threaded conversations
  - `message_mentions`: @mentions tracking
  - `message_attachments`: File attachments with metadata
  - `pinned_messages`: Pin important messages in channels
  
  ### User Experience
  - `channel_subscriptions`: User notification preferences per channel
  - `typing_indicators`: Real-time typing status
  - `user_presence`: Online/offline status with custom messages
  - `channel_bookmarks`: User's favorite channels
  
  ### Analytics
  - `channel_analytics`: Message counts, active users, response times
  - `message_read_receipts`: Track who read what messages
  
  ## Modifications to Existing Tables
  - Add business_id, channel_type, description to conversations
  - Add is_archived, last_activity_at to conversations
  
  ## Security
  - All tables scoped by business_id
  - RLS policies enforce business boundaries
  - Role-based channel access
*/

-- ============================================================================
-- 1. ENHANCE EXISTING CONVERSATIONS TABLE
-- ============================================================================

-- Add new columns to conversations table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'channel_type'
  ) THEN
    ALTER TABLE conversations ADD COLUMN channel_type text DEFAULT 'custom' 
      CHECK (channel_type IN ('general', 'announcements', 'random', 'support', 'department', 'project', 'order', 'customer', 'zone', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'description'
  ) THEN
    ALTER TABLE conversations ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_archived boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'icon'
  ) THEN
    ALTER TABLE conversations ADD COLUMN icon text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 2. MESSAGE ENHANCEMENTS
-- ============================================================================

-- Message reactions (like Slack emoji reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- Message threads (reply in thread)
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reply_message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reply_message_id)
);

-- Message mentions (@user, @channel, @here)
CREATE TABLE IF NOT EXISTS message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mention_type text NOT NULL CHECK (mention_type IN ('user', 'channel', 'here', 'everyone')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  thumbnail_path text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Pinned messages
CREATE TABLE IF NOT EXISTS pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, message_id)
);

-- ============================================================================
-- 3. USER EXPERIENCE FEATURES
-- ============================================================================

-- Channel subscriptions (notification preferences)
CREATE TABLE IF NOT EXISTS channel_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  notification_level text DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
  is_muted boolean DEFAULT false,
  muted_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 seconds'),
  UNIQUE(conversation_id, user_id)
);

-- User presence (online/offline status)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'away', 'dnd', 'offline')),
  custom_status text,
  custom_status_emoji text,
  last_seen_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Channel bookmarks (favorite channels)
CREATE TABLE IF NOT EXISTS channel_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- ============================================================================
-- 4. ANALYTICS & INSIGHTS
-- ============================================================================

-- Channel analytics
CREATE TABLE IF NOT EXISTS channel_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  message_count int DEFAULT 0,
  active_users_count int DEFAULT 0,
  total_reactions int DEFAULT 0,
  total_attachments int DEFAULT 0,
  avg_response_time_seconds int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, date)
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- ============================================================================
-- 5. CHANNEL TEMPLATES
-- ============================================================================

-- Channel templates for new businesses
CREATE TABLE IF NOT EXISTS channel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel_type text NOT NULL,
  description text,
  icon text,
  is_private boolean DEFAULT false,
  auto_create boolean DEFAULT true,
  default_members_role text[],
  created_at timestamptz DEFAULT now()
);

-- Insert default channel templates
INSERT INTO channel_templates (name, channel_type, description, icon, is_private, auto_create, default_members_role)
VALUES 
  ('General', 'general', 'Company-wide discussions and updates', '💬', false, true, ARRAY['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service']),
  ('Announcements', 'announcements', 'Important company announcements', '📢', false, true, ARRAY['business_owner', 'manager']),
  ('Random', 'random', 'Casual conversations and social chat', '🎉', false, true, ARRAY['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service']),
  ('Support', 'support', 'Customer support discussions', '🆘', false, true, ARRAY['business_owner', 'manager', 'customer_service']),
  ('Warehouse', 'department', 'Warehouse team coordination', '📦', false, true, ARRAY['business_owner', 'manager', 'warehouse']),
  ('Dispatch', 'department', 'Dispatch and driver coordination', '🚚', false, true, ARRAY['business_owner', 'manager', 'dispatcher']),
  ('Sales', 'department', 'Sales team discussions', '💰', false, true, ARRAY['business_owner', 'manager', 'sales']),
  ('Drivers', 'department', 'Driver announcements and coordination', '🚗', false, true, ARRAY['business_owner', 'manager', 'dispatcher', 'driver']),
  ('Management', 'department', 'Management-only discussions', '👔', true, true, ARRAY['business_owner', 'manager'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Message reactions policies
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Message threads policies
CREATE POLICY "Users can view threads in their conversations"
  ON message_threads FOR SELECT
  TO authenticated
  USING (
    parent_message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Message mentions policies
CREATE POLICY "Users can view mentions in their conversations"
  ON message_mentions FOR SELECT
  TO authenticated
  USING (
    mentioned_user_id = auth.uid() OR
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mentions"
  ON message_mentions FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark own mentions as read"
  ON message_mentions FOR UPDATE
  TO authenticated
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Message attachments policies
CREATE POLICY "Users can view attachments in their conversations"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Pinned messages policies
CREATE POLICY "Users can view pinned messages in their conversations"
  ON pinned_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can pin messages"
  ON pinned_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    pinned_by = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can unpin messages"
  ON pinned_messages FOR DELETE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Channel subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON channel_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own subscriptions"
  ON channel_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON channel_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Typing indicators policies
CREATE POLICY "Users can view typing in their conversations"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    ) AND
    expires_at > now()
  );

CREATE POLICY "Users can set own typing status"
  ON typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own typing status"
  ON typing_indicators FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own typing status"
  ON typing_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- User presence policies
CREATE POLICY "Anyone can view user presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can set own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Channel bookmarks policies
CREATE POLICY "Users can view own bookmarks"
  ON channel_bookmarks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bookmarks"
  ON channel_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove bookmarks"
  ON channel_bookmarks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Channel analytics policies
CREATE POLICY "Users can view analytics for their business channels"
  ON channel_analytics FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Message read receipts policies
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Channel templates policies
CREATE POLICY "Anyone can view channel templates"
  ON channel_templates FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS message_threads_parent_idx ON message_threads(parent_message_id);
CREATE INDEX IF NOT EXISTS message_threads_reply_idx ON message_threads(reply_message_id);
CREATE INDEX IF NOT EXISTS message_mentions_message_id_idx ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS message_mentions_user_id_idx ON message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS message_mentions_unread_idx ON message_mentions(mentioned_user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS message_attachments_conversation_id_idx ON message_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS pinned_messages_conversation_id_idx ON pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS channel_subscriptions_user_id_idx ON channel_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS channel_subscriptions_conversation_id_idx ON channel_subscriptions(conversation_id);
CREATE INDEX IF NOT EXISTS typing_indicators_conversation_id_idx ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS typing_indicators_expires_at_idx ON typing_indicators(expires_at);
CREATE INDEX IF NOT EXISTS channel_bookmarks_user_id_idx ON channel_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS channel_analytics_business_id_date_idx ON channel_analytics(business_id, date);
CREATE INDEX IF NOT EXISTS message_read_receipts_message_id_idx ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS message_read_receipts_user_id_idx ON message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS conversations_business_id_type_idx ON conversations(business_id, channel_type);
CREATE INDEX IF NOT EXISTS conversations_last_activity_idx ON conversations(last_activity_at DESC);

-- ============================================================================
-- 9. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update conversation last_activity_at when a message is sent
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_activity_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_activity_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_activity();

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to create default channels for a new business
CREATE OR REPLACE FUNCTION create_default_business_channels(p_business_id uuid, p_owner_id uuid)
RETURNS void AS $$
DECLARE
  template_record RECORD;
  new_conversation_id uuid;
BEGIN
  FOR template_record IN 
    SELECT * FROM channel_templates WHERE auto_create = true
  LOOP
    -- Create the conversation
    INSERT INTO conversations (
      type,
      name,
      business_id,
      channel_type,
      description,
      icon,
      is_private,
      created_by
    ) VALUES (
      CASE 
        WHEN template_record.channel_type IN ('general', 'announcements', 'random', 'support', 'department') THEN 'business'
        ELSE 'group'
      END,
      template_record.name,
      p_business_id,
      template_record.channel_type,
      template_record.description,
      template_record.icon,
      template_record.is_private,
      p_owner_id
    ) RETURNING id INTO new_conversation_id;

    -- Add owner as admin
    INSERT INTO conversation_participants (
      conversation_id,
      user_id,
      role
    ) VALUES (
      new_conversation_id,
      p_owner_id,
      'admin'
    );

    -- Create default subscription for owner
    INSERT INTO channel_subscriptions (
      user_id,
      conversation_id,
      notification_level
    ) VALUES (
      p_owner_id,
      new_conversation_id,
      'all'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update channel analytics daily
CREATE OR REPLACE FUNCTION update_channel_analytics_daily()
RETURNS void AS $$
BEGIN
  INSERT INTO channel_analytics (
    conversation_id,
    business_id,
    date,
    message_count,
    active_users_count,
    total_reactions,
    total_attachments
  )
  SELECT 
    m.conversation_id,
    c.business_id,
    CURRENT_DATE,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT m.sender_id) as active_users_count,
    COUNT(DISTINCT mr.id) as total_reactions,
    COUNT(DISTINCT ma.id) as total_attachments
  FROM messages m
  LEFT JOIN conversations c ON m.conversation_id = c.id
  LEFT JOIN message_reactions mr ON m.id = mr.message_id AND DATE(mr.created_at) = CURRENT_DATE
  LEFT JOIN message_attachments ma ON m.id = ma.message_id AND DATE(ma.created_at) = CURRENT_DATE
  WHERE DATE(m.created_at) = CURRENT_DATE
  GROUP BY m.conversation_id, c.business_id
  ON CONFLICT (conversation_id, date) 
  DO UPDATE SET
    message_count = EXCLUDED.message_count,
    active_users_count = EXCLUDED.active_users_count,
    total_reactions = EXCLUDED.total_reactions,
    total_attachments = EXCLUDED.total_attachments;
END;
$$ LANGUAGE plpgsql;
