import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface Story {
  id: string;
  user_id: string;
  business_id?: string;
  story_type: 'photo' | 'video' | 'text' | 'poll' | 'question' | 'link';
  media_url?: string;
  media_thumbnail?: string;
  duration_seconds: number;
  background_color?: string;
  text_content?: string;
  text_position?: any;
  link_url?: string;
  link_title?: string;
  visibility: 'public' | 'followers' | 'close_friends' | 'private';
  music_id?: string;
  stickers?: any[];
  filters?: any;
  location?: any;
  mentions?: string[];
  hashtags?: string[];
  view_count: number;
  reply_count: number;
  share_count: number;
  expires_at: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  view_duration_seconds?: number;
  completed: boolean;
  created_at: string;
}

export interface StoryHighlight {
  id: string;
  user_id: string;
  business_id?: string;
  title: string;
  cover_image?: string;
  cover_story_id?: string;
  description?: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  stories?: Story[];
}

export interface CreateStoryInput {
  story_type: Story['story_type'];
  media_url?: string;
  media_thumbnail?: string;
  duration_seconds?: number;
  background_color?: string;
  text_content?: string;
  text_position?: any;
  link_url?: string;
  link_title?: string;
  visibility?: Story['visibility'];
  business_id?: string;
  stickers?: any[];
  mentions?: string[];
  hashtags?: string[];
}

export class StoriesService {
  async createStory(input: CreateStoryInput): Promise<Story> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          ...input,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('Story created', { storyId: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create story', { error });
      throw error;
    }
  }

  async getUserStories(userId: string): Promise<Story[]> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch user stories', { error, userId });
      return [];
    }
  }

  async getActiveStories(): Promise<Record<string, Story[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq('is_archived', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupedByUser: Record<string, Story[]> = {};
      data?.forEach((story: any) => {
        const userId = story.user_id;
        if (!groupedByUser[userId]) {
          groupedByUser[userId] = [];
        }
        groupedByUser[userId].push(story);
      });

      return groupedByUser;
    } catch (error) {
      logger.error('Failed to fetch active stories', { error });
      return {};
    }
  }

  async viewStory(storyId: string, durationSeconds?: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: user.id,
          view_duration_seconds: durationSeconds,
          completed: durationSeconds ? durationSeconds >= 3 : false,
        });

      logger.info('Story viewed', { storyId });
    } catch (error) {
      logger.error('Failed to record story view', { error, storyId });
    }
  }

  async getStoryViews(storyId: string): Promise<StoryView[]> {
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select(`
          *,
          profiles:viewer_id (id, username, full_name, avatar_url)
        `)
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch story views', { error, storyId });
      return [];
    }
  }

  async createHighlight(title: string, storyIds: string[], coverImage?: string): Promise<StoryHighlight> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: highlight, error: highlightError } = await supabase
        .from('story_highlights')
        .insert({
          user_id: user.id,
          title,
          cover_image: coverImage,
        })
        .select()
        .single();

      if (highlightError) throw highlightError;

      const items = storyIds.map((storyId, index) => ({
        highlight_id: highlight.id,
        story_id: storyId,
        display_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('story_highlight_items')
        .insert(items);

      if (itemsError) throw itemsError;

      logger.info('Story highlight created', { highlightId: highlight.id });
      return highlight;
    } catch (error) {
      logger.error('Failed to create story highlight', { error });
      throw error;
    }
  }

  async getUserHighlights(userId: string): Promise<StoryHighlight[]> {
    try {
      const { data, error } = await supabase
        .from('story_highlights')
        .select(`
          *,
          story_highlight_items (
            story_id,
            display_order,
            stories (*)
          )
        `)
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch user highlights', { error, userId });
      return [];
    }
  }

  async deleteStory(storyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      logger.info('Story deleted', { storyId });
    } catch (error) {
      logger.error('Failed to delete story', { error, storyId });
      throw error;
    }
  }

  async archiveExpiredStories(): Promise<void> {
    try {
      const { error } = await supabase
        .from('stories')
        .update({ is_archived: true })
        .eq('is_archived', false)
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
      logger.info('Expired stories archived');
    } catch (error) {
      logger.error('Failed to archive expired stories', { error });
    }
  }
}

export const storiesService = new StoriesService();
