import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  Post,
  PostComment,
  User,
  TrendingTopic,
  CreatePostInput,
  CreateCommentInput,
  UpdateProfileInput,
  FeedFilters,
  PostMedia,
  Hashtag
} from '../data/types';

export class SocialMediaService {
  constructor(private supabase: SupabaseClient) {}

  async getUserProfile(user_id?: string): Promise<UserProfile | null> {
    const targetUserId = user_id || (await this.supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUserProfile(updates: UpdateProfileInput): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async createPost(input: CreatePostInput): Promise<{ id: string }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { content, visibility = 'public', reply_to_post_id, business_id, media } = input;

    const postData: any = {
      user_id: user.id,
      content,
      visibility,
      is_reply: !!reply_to_post_id,
      is_repost: false
    };

    if (reply_to_post_id) postData.reply_to_post_id = reply_to_post_id;
    if (business_id) postData.business_id = business_id;

    const { data: post, error: postError } = await this.supabase
      .from('posts')
      .insert(postData)
      .select('id')
      .single();

    if (postError) throw postError;

    if (media && media.length > 0) {
      const mediaData = media.map((m, index) => ({
        post_id: post.id,
        media_type: m.media_type,
        media_url: m.media_url,
        thumbnail_url: m.thumbnail_url,
        display_order: index
      }));

      const { error: mediaError } = await this.supabase
        .from('post_media')
        .insert(mediaData);

      if (mediaError) throw mediaError;
    }

    const hashtags = this.extractHashtags(content);
    if (hashtags.length > 0) {
      await this.processHashtags(post.id, hashtags);
    }

    const mentions = this.extractMentions(content);
    if (mentions.length > 0) {
      await this.processMentions(post.id, mentions, user.id);
    }

    return { id: post.id };
  }

  async deletePost(post_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', post_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getPost(post_id: string): Promise<Post | null> {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, name, username, photo_url),
        media:post_media(*),
        hashtags:post_hashtags(hashtag:hashtags(*))
      `)
      .eq('id', post_id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return this.enrichPost(data);
  }

  async getFeed(filters: FeedFilters = {}): Promise<Post[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = this.supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, name, username, photo_url),
        media:post_media(*),
        hashtags:post_hashtags(hashtag:hashtags(*))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.following_only) {
      const { data: following } = await this.supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (following && following.length > 0) {
        const followingIds = following.map(f => f.following_id);
        query = query.in('user_id', followingIds);
      } else {
        return [];
      }
    }

    if (filters.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters.hashtag) {
      const { data: hashtagData } = await this.supabase
        .from('hashtags')
        .select('id')
        .eq('tag', filters.hashtag.toLowerCase())
        .single();

      if (hashtagData) {
        const { data: postIds } = await this.supabase
          .from('post_hashtags')
          .select('post_id')
          .eq('hashtag_id', hashtagData.id);

        if (postIds && postIds.length > 0) {
          query = query.in('id', postIds.map(p => p.post_id));
        } else {
          return [];
        }
      } else {
        return [];
      }
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    return Promise.all(data.map(post => this.enrichPost(post)));
  }

  async getUserPosts(user_id: string, limit = 50): Promise<Post[]> {
    return this.getFeed({ user_id, limit });
  }

  async likePost(post_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('post_likes')
      .insert({ post_id, user_id: user.id });

    if (error && error.code !== '23505') throw error;
  }

  async unlikePost(post_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('post_likes')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async repostPost(post_id: string, comment?: string): Promise<{ id: string }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('post_reposts')
      .insert({ post_id, user_id: user.id, comment })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async unrepostPost(post_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('post_reposts')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async createComment(input: CreateCommentInput): Promise<{ id: string }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('post_comments')
      .insert({
        post_id: input.post_id,
        user_id: user.id,
        content: input.content,
        parent_comment_id: input.parent_comment_id
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async deleteComment(comment_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('post_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', comment_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getPostComments(post_id: string, limit = 50): Promise<PostComment[]> {
    const { data, error } = await this.supabase
      .from('post_comments')
      .select(`
        *,
        user:users!post_comments_user_id_fkey(id, name, username, photo_url)
      `)
      .eq('post_id', post_id)
      .is('deleted_at', null)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return Promise.all(data.map(async (comment) => {
      const { data: replies } = await this.supabase
        .from('post_comments')
        .select(`
          *,
          user:users!post_comments_user_id_fkey(id, name, username, photo_url)
        `)
        .eq('parent_comment_id', comment.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      return { ...comment, replies: replies || [] };
    }));
  }

  async followUser(user_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_follows')
      .insert({ follower_id: user.id, following_id: user_id });

    if (error && error.code !== '23505') throw error;
  }

  async unfollowUser(user_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', user_id);

    if (error) throw error;
  }

  async getFollowers(user_id?: string, limit = 50): Promise<User[]> {
    const { data: { user: currentUser } } = await this.supabase.auth.getUser();
    const targetUserId = user_id || currentUser?.id;
    if (!targetUserId) return [];

    const { data, error } = await this.supabase
      .from('user_follows')
      .select('follower:users!user_follows_follower_id_fkey(id, name, username, photo_url, role)')
      .eq('following_id', targetUserId)
      .limit(limit);

    if (error) throw error;
    return data.map(d => d.follower);
  }

  async getFollowing(user_id?: string, limit = 50): Promise<User[]> {
    const { data: { user: currentUser } } = await this.supabase.auth.getUser();
    const targetUserId = user_id || currentUser?.id;
    if (!targetUserId) return [];

    const { data, error } = await this.supabase
      .from('user_follows')
      .select('following:users!user_follows_following_id_fkey(id, name, username, photo_url, role)')
      .eq('follower_id', targetUserId)
      .limit(limit);

    if (error) throw error;
    return data.map(d => d.following);
  }

  async isFollowing(user_id: string): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await this.supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', user_id)
      .single();

    return !!data && !error;
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, username, photo_url, role')
      .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getTrendingTopics(limit = 10): Promise<TrendingTopic[]> {
    const { data, error } = await this.supabase
      .from('trending_topics')
      .select(`
        *,
        hashtag:hashtags(*)
      `)
      .eq('trend_date', new Date().toISOString().split('T')[0])
      .order('engagement_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async searchPosts(query: string, filters: FeedFilters = {}): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, name, username, photo_url),
        media:post_media(*),
        hashtags:post_hashtags(hashtag:hashtags(*))
      `)
      .ilike('content', `%${query}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50);

    if (error) throw error;
    return Promise.all(data.map(post => this.enrichPost(post)));
  }

  async bookmarkPost(post_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('post_bookmarks')
      .insert({ post_id, user_id: user.id });

    if (error && error.code !== '23505') throw error;
  }

  async unbookmarkPost(post_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getBookmarkedPosts(limit = 50): Promise<Post[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data: bookmarks, error: bookmarksError } = await this.supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bookmarksError) throw bookmarksError;

    if (!bookmarks || bookmarks.length === 0) return [];

    const postIds = bookmarks.map(b => b.post_id);
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, name, username, photo_url),
        media:post_media(*),
        hashtags:post_hashtags(hashtag:hashtags(*))
      `)
      .in('id', postIds)
      .is('deleted_at', null);

    if (error) throw error;
    return Promise.all(data.map(post => this.enrichPost(post)));
  }

  async blockUser(user_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: user_id });

    if (error && error.code !== '23505') throw error;
  }

  async unblockUser(user_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', user_id);

    if (error) throw error;
  }

  async muteUser(user_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_mutes')
      .insert({ muter_id: user.id, muted_id: user_id });

    if (error && error.code !== '23505') throw error;
  }

  async unmuteUser(user_id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('user_mutes')
      .delete()
      .eq('muter_id', user.id)
      .eq('muted_id', user_id);

    if (error) throw error;
  }

  async getBlockedUsers(): Promise<User[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('user_blocks')
      .select('blocked:users!user_blocks_blocked_id_fkey(id, name, username, photo_url, role)')
      .eq('blocker_id', user.id);

    if (error) throw error;
    return data.map(d => d.blocked);
  }

  async getMutedUsers(): Promise<User[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('user_mutes')
      .select('muted:users!user_mutes_muted_id_fkey(id, name, username, photo_url, role)')
      .eq('muter_id', user.id);

    if (error) throw error;
    return data.map(d => d.muted);
  }

  private async enrichPost(post: any): Promise<Post> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (user) {
      const { data: likeData } = await this.supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();

      const { data: repostData } = await this.supabase
        .from('post_reposts')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();

      const { data: bookmarkData } = await this.supabase
        .from('post_bookmarks')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();

      post.is_liked = !!likeData;
      post.is_reposted = !!repostData;
      post.is_bookmarked = !!bookmarkData;
    }

    return post;
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.matchAll(hashtagRegex);
    return Array.from(matches, m => m[1].toLowerCase());
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    return Array.from(matches, m => m[1].toLowerCase());
  }

  private async processHashtags(post_id: string, hashtags: string[]): Promise<void> {
    for (const tag of hashtags) {
      const { data: existingHashtag } = await this.supabase
        .from('hashtags')
        .select('id')
        .eq('tag', tag)
        .single();

      let hashtagId: string;
      if (existingHashtag) {
        hashtagId = existingHashtag.id;
      } else {
        const { data: newHashtag } = await this.supabase
          .from('hashtags')
          .insert({ tag })
          .select('id')
          .single();
        hashtagId = newHashtag!.id;
      }

      await this.supabase
        .from('post_hashtags')
        .insert({ post_id, hashtag_id: hashtagId });
    }
  }

  private async processMentions(post_id: string, mentions: string[], mentioning_user_id: string): Promise<void> {
    for (const username of mentions) {
      const { data: mentionedUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (mentionedUser) {
        await this.supabase
          .from('user_mentions')
          .insert({
            post_id,
            mentioned_user_id: mentionedUser.id,
            mentioning_user_id
          });
      }
    }
  }
}
