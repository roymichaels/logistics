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
  Hashtag
} from '../data/types';
import { frontendOnlyDataStore } from '../lib/frontendOnlyDataStore';
import { logger } from '../lib/logger';

export class SocialMediaService {
  constructor() {
    logger.info('[FRONTEND-ONLY] SocialMediaService initialized - using local storage');
  }

  private getCurrentUserId(): string {
    const storedUser = localStorage.getItem('wallet_session');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed.address || parsed.id || 'anonymous';
      } catch {
        return 'anonymous';
      }
    }
    return 'anonymous';
  }

  async getUserProfile(user_id?: string): Promise<UserProfile | null> {
    const targetUserId = user_id || this.getCurrentUserId();
    const profiles = await frontendOnlyDataStore.query('user_profiles', { user_id: targetUserId });
    return profiles[0] || null;
  }

  async updateUserProfile(updates: UpdateProfileInput): Promise<void> {
    const userId = this.getCurrentUserId();
    const profiles = await frontendOnlyDataStore.query('user_profiles', { user_id: userId });

    if (profiles.length > 0) {
      await frontendOnlyDataStore.update('user_profiles', profiles[0].id, updates);
    } else {
      await frontendOnlyDataStore.insert('user_profiles', { user_id: userId, ...updates });
    }
  }

  async createPost(input: CreatePostInput): Promise<{ id: string }> {
    const userId = this.getCurrentUserId();
    const { content, visibility = 'public', reply_to_post_id, business_id, media } = input;

    const postData: any = {
      user_id: userId,
      content,
      visibility,
      is_reply: !!reply_to_post_id,
      is_reposted: false,
      like_count: 0,
      repost_count: 0,
      comment_count: 0
    };

    if (reply_to_post_id) postData.reply_to_post_id = reply_to_post_id;
    if (business_id) postData.business_id = business_id;

    const { data: post } = await frontendOnlyDataStore.insert('posts', postData);

    if (media && media.length > 0) {
      const mediaData = media.map((m, index) => ({
        post_id: post.id,
        media_type: m.media_type,
        media_url: m.media_url,
        thumbnail_url: m.thumbnail_url,
        display_order: index
      }));

      await frontendOnlyDataStore.batchInsert('post_media', mediaData);
    }

    const hashtags = this.extractHashtags(content);
    if (hashtags.length > 0) {
      await this.processHashtags(post.id, hashtags);
    }

    const mentions = this.extractMentions(content);
    if (mentions.length > 0) {
      await this.processMentions(post.id, mentions, userId);
    }

    return { id: post.id };
  }

  async deletePost(post_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const posts = await frontendOnlyDataStore.query('posts', { id: post_id, user_id: userId });

    if (posts.length > 0) {
      await frontendOnlyDataStore.update('posts', post_id, { deleted_at: new Date().toISOString() });
    }
  }

  async getPost(post_id: string): Promise<Post | null> {
    const posts = await frontendOnlyDataStore.query('posts', { id: post_id });
    if (posts.length === 0 || posts[0].deleted_at) return null;

    const media = await frontendOnlyDataStore.query('post_media', { post_id });
    const user = await this.getUserById(posts[0].user_id);
    const hashtags = await this.getPostHashtags(post_id);

    const post = {
      ...posts[0],
      user,
      media,
      hashtags
    };

    return this.enrichPost(post);
  }

  async getFeed(filters: FeedFilters = {}): Promise<Post[]> {
    const userId = this.getCurrentUserId();
    let posts = await frontendOnlyDataStore.query('posts');

    posts = posts.filter(post => !post.deleted_at);

    if (filters.user_id) {
      posts = posts.filter(post => post.user_id === filters.user_id);
    }

    if (filters.following_only) {
      const following = await frontendOnlyDataStore.query('user_follows', { follower_id: userId });
      const followingIds = following.map(f => f.following_id);
      posts = posts.filter(post => followingIds.includes(post.user_id));
    }

    if (filters.business_id) {
      posts = posts.filter(post => post.business_id === filters.business_id);
    }

    if (filters.hashtag) {
      const hashtagRecords = await frontendOnlyDataStore.query('hashtags', { tag: filters.hashtag.toLowerCase() });
      if (hashtagRecords.length > 0) {
        const postHashtags = await frontendOnlyDataStore.query('post_hashtags', { hashtag_id: hashtagRecords[0].id });
        const postIds = postHashtags.map(ph => ph.post_id);
        posts = posts.filter(post => postIds.includes(post.id));
      } else {
        return [];
      }
    }

    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    posts = posts.slice(offset, offset + limit);

    const enrichedPosts = await Promise.all(posts.map(post => this.enrichPostData(post)));
    return enrichedPosts;
  }

  async getUserPosts(user_id: string, limit = 50): Promise<Post[]> {
    return this.getFeed({ user_id, limit });
  }

  async likePost(post_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    await frontendOnlyDataStore.insert('post_likes', { post_id, user_id: userId });
  }

  async unlikePost(post_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const likes = await frontendOnlyDataStore.query('post_likes', { post_id, user_id: userId });
    if (likes.length > 0) {
      await frontendOnlyDataStore.delete('post_likes', likes[0].id);
    }
  }

  async repostPost(post_id: string, comment?: string): Promise<{ id: string }> {
    const userId = this.getCurrentUserId();
    const { data } = await frontendOnlyDataStore.insert('post_reposts', { post_id, user_id: userId, comment });
    return { id: data.id };
  }

  async unrepostPost(post_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const reposts = await frontendOnlyDataStore.query('post_reposts', { post_id, user_id: userId });
    if (reposts.length > 0) {
      await frontendOnlyDataStore.delete('post_reposts', reposts[0].id);
    }
  }

  async createComment(input: CreateCommentInput): Promise<{ id: string }> {
    const userId = this.getCurrentUserId();
    const { data } = await frontendOnlyDataStore.insert('post_comments', {
      post_id: input.post_id,
      user_id: userId,
      content: input.content,
      parent_comment_id: input.parent_comment_id
    });
    return { id: data.id };
  }

  async deleteComment(comment_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const comments = await frontendOnlyDataStore.query('post_comments', { id: comment_id, user_id: userId });
    if (comments.length > 0) {
      await frontendOnlyDataStore.update('post_comments', comment_id, { deleted_at: new Date().toISOString() });
    }
  }

  async getPostComments(post_id: string, limit = 50): Promise<PostComment[]> {
    const comments = await frontendOnlyDataStore.query('post_comments', { post_id });
    const topLevel = comments.filter(c => !c.deleted_at && !c.parent_comment_id);

    const enriched = await Promise.all(topLevel.map(async (comment) => {
      const user = await this.getUserById(comment.user_id);
      const replies = await this.getCommentReplies(comment.id);
      return { ...comment, user, replies };
    }));

    return enriched.slice(0, limit);
  }

  private async getCommentReplies(parent_id: string): Promise<any[]> {
    const replies = await frontendOnlyDataStore.query('post_comments', { parent_comment_id: parent_id });
    return Promise.all(replies.filter(r => !r.deleted_at).map(async (reply) => {
      const user = await this.getUserById(reply.user_id);
      return { ...reply, user };
    }));
  }

  async followUser(user_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    await frontendOnlyDataStore.insert('user_follows', { follower_id: userId, following_id: user_id });
  }

  async unfollowUser(user_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const follows = await frontendOnlyDataStore.query('user_follows', { follower_id: userId, following_id: user_id });
    if (follows.length > 0) {
      await frontendOnlyDataStore.delete('user_follows', follows[0].id);
    }
  }

  async getFollowers(user_id?: string, limit = 50): Promise<User[]> {
    const targetUserId = user_id || this.getCurrentUserId();
    const follows = await frontendOnlyDataStore.query('user_follows', { following_id: targetUserId });
    const users = await Promise.all(follows.slice(0, limit).map(f => this.getUserById(f.follower_id)));
    return users.filter(u => u !== null) as User[];
  }

  async getFollowing(user_id?: string, limit = 50): Promise<User[]> {
    const targetUserId = user_id || this.getCurrentUserId();
    const follows = await frontendOnlyDataStore.query('user_follows', { follower_id: targetUserId });
    const users = await Promise.all(follows.slice(0, limit).map(f => this.getUserById(f.following_id)));
    return users.filter(u => u !== null) as User[];
  }

  async isFollowing(user_id: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    const follows = await frontendOnlyDataStore.query('user_follows', { follower_id: userId, following_id: user_id });
    return follows.length > 0;
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const users = await frontendOnlyDataStore.query('users');
    const filtered = users.filter(u =>
      (u.name && u.name.toLowerCase().includes(query.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(query.toLowerCase()))
    );
    return filtered.slice(0, limit);
  }

  async getTrendingTopics(limit = 10): Promise<TrendingTopic[]> {
    const topics = await frontendOnlyDataStore.query('trending_topics');
    const today = new Date().toISOString().split('T')[0];
    const todayTopics = topics.filter(t => t.trend_date === today);

    todayTopics.sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0));
    return todayTopics.slice(0, limit);
  }

  async searchPosts(query: string, filters: FeedFilters = {}): Promise<Post[]> {
    const posts = await frontendOnlyDataStore.query('posts');
    const filtered = posts.filter(post =>
      !post.deleted_at &&
      post.content &&
      post.content.toLowerCase().includes(query.toLowerCase())
    );

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const enriched = await Promise.all(filtered.slice(0, filters.limit || 50).map(post => this.enrichPostData(post)));
    return enriched;
  }

  async bookmarkPost(post_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    await frontendOnlyDataStore.insert('post_bookmarks', { post_id, user_id: userId });
  }

  async unbookmarkPost(post_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const bookmarks = await frontendOnlyDataStore.query('post_bookmarks', { post_id, user_id: userId });
    if (bookmarks.length > 0) {
      await frontendOnlyDataStore.delete('post_bookmarks', bookmarks[0].id);
    }
  }

  async getBookmarkedPosts(limit = 50): Promise<Post[]> {
    const userId = this.getCurrentUserId();
    const bookmarks = await frontendOnlyDataStore.query('post_bookmarks', { user_id: userId });

    bookmarks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const posts = await Promise.all(
      bookmarks.slice(0, limit).map(async (b) => {
        const postData = await frontendOnlyDataStore.query('posts', { id: b.post_id });
        return postData[0] && !postData[0].deleted_at ? this.enrichPostData(postData[0]) : null;
      })
    );

    return posts.filter(p => p !== null) as Post[];
  }

  async blockUser(user_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    await frontendOnlyDataStore.insert('user_blocks', { blocker_id: userId, blocked_id: user_id });
  }

  async unblockUser(user_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const blocks = await frontendOnlyDataStore.query('user_blocks', { blocker_id: userId, blocked_id: user_id });
    if (blocks.length > 0) {
      await frontendOnlyDataStore.delete('user_blocks', blocks[0].id);
    }
  }

  async muteUser(user_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    await frontendOnlyDataStore.insert('user_mutes', { muter_id: userId, muted_id: user_id });
  }

  async unmuteUser(user_id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const mutes = await frontendOnlyDataStore.query('user_mutes', { muter_id: userId, muted_id: user_id });
    if (mutes.length > 0) {
      await frontendOnlyDataStore.delete('user_mutes', mutes[0].id);
    }
  }

  async getBlockedUsers(): Promise<User[]> {
    const userId = this.getCurrentUserId();
    const blocks = await frontendOnlyDataStore.query('user_blocks', { blocker_id: userId });
    const users = await Promise.all(blocks.map(b => this.getUserById(b.blocked_id)));
    return users.filter(u => u !== null) as User[];
  }

  async getMutedUsers(): Promise<User[]> {
    const userId = this.getCurrentUserId();
    const mutes = await frontendOnlyDataStore.query('user_mutes', { muter_id: userId });
    const users = await Promise.all(mutes.map(m => this.getUserById(m.muted_id)));
    return users.filter(u => u !== null) as User[];
  }

  private async enrichPost(post: any): Promise<Post> {
    const userId = this.getCurrentUserId();

    const likes = await frontendOnlyDataStore.query('post_likes', { post_id: post.id, user_id: userId });
    const reposts = await frontendOnlyDataStore.query('post_reposts', { post_id: post.id, user_id: userId });
    const bookmarks = await frontendOnlyDataStore.query('post_bookmarks', { post_id: post.id, user_id: userId });

    post.is_liked = likes.length > 0;
    post.is_reposted = reposts.length > 0;
    post.is_bookmarked = bookmarks.length > 0;

    return post;
  }

  private async enrichPostData(post: any): Promise<Post> {
    const user = await this.getUserById(post.user_id);
    const media = await frontendOnlyDataStore.query('post_media', { post_id: post.id });
    const hashtags = await this.getPostHashtags(post.id);

    return this.enrichPost({
      ...post,
      user,
      media,
      hashtags
    });
  }

  private async getUserById(user_id: string): Promise<User | null> {
    const users = await frontendOnlyDataStore.query('users', { id: user_id });
    return users[0] || null;
  }

  private async getPostHashtags(post_id: string): Promise<any[]> {
    const postHashtags = await frontendOnlyDataStore.query('post_hashtags', { post_id });
    const hashtags = await Promise.all(
      postHashtags.map(async (ph) => {
        const hashtagData = await frontendOnlyDataStore.query('hashtags', { id: ph.hashtag_id });
        return hashtagData[0];
      })
    );
    return hashtags.filter(h => h !== undefined);
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
      const existing = await frontendOnlyDataStore.query('hashtags', { tag });

      let hashtagId: string;
      if (existing.length > 0) {
        hashtagId = existing[0].id;
      } else {
        const { data } = await frontendOnlyDataStore.insert('hashtags', { tag });
        hashtagId = data.id;
      }

      await frontendOnlyDataStore.insert('post_hashtags', { post_id, hashtag_id: hashtagId });
    }
  }

  private async processMentions(post_id: string, mentions: string[], mentioning_user_id: string): Promise<void> {
    for (const username of mentions) {
      const users = await frontendOnlyDataStore.query('users', { username });

      if (users.length > 0) {
        await frontendOnlyDataStore.insert('user_mentions', {
          post_id,
          mentioned_user_id: users[0].id,
          mentioning_user_id
        });
      }
    }
  }
}
