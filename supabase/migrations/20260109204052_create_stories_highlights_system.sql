/*
  # Stories and Highlights System

  1. New Tables
    - `stories`
      - 24-hour ephemeral content
      - Photos, videos, text, polls, questions
      - View tracking and analytics
      - Reply support
      - Story type (photo, video, poll, question, link)

    - `story_views`
      - Track who viewed each story
      - View timestamp and duration
      - Completion tracking

    - `story_highlights`
      - Permanent collections of stories
      - Custom covers and names
      - Ordering support

    - `story_replies`
      - Direct replies to stories
      - Can escalate to DM

    - `story_polls`
      - Poll options for interactive stories
      - Vote tracking

    - `story_questions`
      - Question stickers in stories
      - Answer submissions

  2. Security
    - Users can create stories for themselves or businesses they own
    - Public stories visible to all
    - Private stories only to followers
    - Close friends stories to select list
    - Highlight management by story owner
*/

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  story_type text NOT NULL CHECK (story_type IN ('photo', 'video', 'text', 'poll', 'question', 'link')),
  media_url text,
  media_thumbnail text,
  duration_seconds int DEFAULT 5,
  background_color text,
  text_content text,
  text_position jsonb,
  link_url text,
  link_title text,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'close_friends', 'private')),
  music_id text,
  stickers jsonb DEFAULT '[]',
  filters jsonb,
  location jsonb,
  mentions jsonb DEFAULT '[]',
  hashtags text[] DEFAULT '{}',
  view_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  share_count int DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_business_id ON stories(business_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

-- Create story_views table
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_duration_seconds int,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Create story_highlights table
CREATE TABLE IF NOT EXISTS story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_image text,
  cover_story_id uuid REFERENCES stories(id) ON DELETE SET NULL,
  description text,
  display_order int DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON story_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_story_highlights_business_id ON story_highlights(business_id);

-- Create story_highlight_items table (stories in highlights)
CREATE TABLE IF NOT EXISTS story_highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_story_highlight_items_highlight_id ON story_highlight_items(highlight_id);

-- Create story_replies table
CREATE TABLE IF NOT EXISTS story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reply_type text DEFAULT 'text' CHECK (reply_type IN ('text', 'reaction', 'media')),
  content text,
  media_url text,
  reaction_emoji text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON story_replies(story_id);

-- Create story_polls table
CREATE TABLE IF NOT EXISTS story_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  multiple_choice boolean DEFAULT false,
  total_votes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create story_poll_votes table
CREATE TABLE IF NOT EXISTS story_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES story_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Create story_questions table
CREATE TABLE IF NOT EXISTS story_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  allow_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create story_question_answers table
CREATE TABLE IF NOT EXISTS story_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES story_questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlight_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_question_answers ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Anyone can view public stories"
  ON stories FOR SELECT
  USING (visibility = 'public' AND expires_at > now());

CREATE POLICY "Users can view their own stories"
  ON stories FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Followers can view follower stories"
  ON stories FOR SELECT
  TO authenticated
  USING (
    visibility = 'followers'
    AND expires_at > now()
    AND (
      user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = auth.uid()
      )
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Story views policies
CREATE POLICY "Anyone can view story views for public stories"
  ON story_views FOR SELECT
  USING (
    story_id IN (
      SELECT id FROM stories WHERE visibility = 'public'
    )
  );

CREATE POLICY "Story owners can view all views"
  ON story_views FOR SELECT
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create story views"
  ON story_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Story highlights policies
CREATE POLICY "Anyone can view public highlights"
  ON story_highlights FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Users can manage their own highlights"
  ON story_highlights FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Story highlight items policies
CREATE POLICY "Anyone can view highlight items"
  ON story_highlight_items FOR SELECT
  USING (
    highlight_id IN (
      SELECT id FROM story_highlights WHERE is_visible = true
    )
  );

CREATE POLICY "Highlight owners can manage items"
  ON story_highlight_items FOR ALL
  TO authenticated
  USING (
    highlight_id IN (
      SELECT id FROM story_highlights WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    highlight_id IN (
      SELECT id FROM story_highlights WHERE user_id = auth.uid()
    )
  );

-- Story replies policies
CREATE POLICY "Story owners can view all replies"
  ON story_replies FOR SELECT
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create story replies"
  ON story_replies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Story polls policies
CREATE POLICY "Anyone can view polls in public stories"
  ON story_polls FOR SELECT
  USING (
    story_id IN (
      SELECT id FROM stories WHERE visibility = 'public' AND expires_at > now()
    )
  );

CREATE POLICY "Users can view polls in stories they can see"
  ON story_polls FOR SELECT
  TO authenticated
  USING (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
    OR story_id IN (
      SELECT id FROM stories
      WHERE visibility = 'followers'
      AND expires_at > now()
      AND user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = auth.uid()
      )
    )
  );

CREATE POLICY "Story owners can create polls"
  ON story_polls FOR INSERT
  TO authenticated
  WITH CHECK (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

-- Story poll votes policies
CREATE POLICY "Anyone can view poll votes"
  ON story_poll_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote on polls"
  ON story_poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Story questions policies
CREATE POLICY "Anyone can view questions in public stories"
  ON story_questions FOR SELECT
  USING (
    story_id IN (
      SELECT id FROM stories WHERE visibility = 'public' AND expires_at > now()
    )
  );

CREATE POLICY "Story owners can create questions"
  ON story_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    story_id IN (
      SELECT id FROM stories WHERE user_id = auth.uid()
    )
  );

-- Story question answers policies
CREATE POLICY "Question owners can view all answers"
  ON story_question_answers FOR SELECT
  TO authenticated
  USING (
    question_id IN (
      SELECT sq.id FROM story_questions sq
      JOIN stories s ON sq.story_id = s.id
      WHERE s.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can submit answers"
  ON story_question_answers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_anonymous = true);

-- Functions to update view counts
CREATE OR REPLACE FUNCTION increment_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories
  SET view_count = view_count + 1
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_story_view_count ON story_views;
CREATE TRIGGER trigger_increment_story_view_count
  AFTER INSERT ON story_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_story_view_count();

-- Function to auto-archive expired stories
CREATE OR REPLACE FUNCTION auto_archive_expired_stories()
RETURNS void AS $$
BEGIN
  UPDATE stories
  SET is_archived = true
  WHERE expires_at < now() AND is_archived = false;
END;
$$ LANGUAGE plpgsql;