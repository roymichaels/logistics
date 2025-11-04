import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';

interface AnalyticsData {
  totalPosts: number;
  totalLikes: number;
  totalReposts: number;
  totalComments: number;
  followers: number;
  following: number;
  engagementRate: number;
  topPosts: Array<{
    id: string;
    content: string;
    likes_count: number;
    reposts_count: number;
    comments_count: number;
    views_count: number;
    engagement: number;
    created_at: string;
  }>;
  activityByDay: Array<{
    date: string;
    posts: number;
    engagement: number;
  }>;
}

export function SocialAnalytics() {
  const { dataStore } = useAppServices();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const profile = await dataStore.getUserProfile?.(user.id);

      const dateFilter = getDateFilter(timeRange);

      const { data: posts } = await dataStore.supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      const totalPosts = posts?.length || 0;
      const totalLikes = posts?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      const totalReposts = posts?.reduce((sum, p) => sum + (p.reposts_count || 0), 0) || 0;
      const totalComments = posts?.reduce((sum, p) => sum + (p.comments_count || 0), 0) || 0;
      const totalViews = posts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      const engagementRate = totalViews > 0
        ? ((totalLikes + totalReposts + totalComments) / totalViews) * 100
        : 0;

      const topPosts = posts
        ?.map(p => ({
          ...p,
          engagement: (p.likes_count || 0) + (p.reposts_count || 0) * 2 + (p.comments_count || 0) * 3
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 5) || [];

      const activityByDay = calculateActivityByDay(posts || []);

      setAnalytics({
        totalPosts,
        totalLikes,
        totalReposts,
        totalComments,
        followers: profile?.followers_count || 0,
        following: profile?.following_count || 0,
        engagementRate,
        topPosts,
        activityByDay
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return '1970-01-01';
    }
  };

  const calculateActivityByDay = (posts: any[]): Array<{ date: string; posts: number; engagement: number }> => {
    const dayMap = new Map<string, { posts: number; engagement: number }>();

    posts.forEach(post => {
      const date = new Date(post.created_at).toISOString().split('T')[0];
      const existing = dayMap.get(date) || { posts: 0, engagement: 0 };
      dayMap.set(date, {
        posts: existing.posts + 1,
        engagement: existing.engagement + (post.likes_count + post.reposts_count + post.comments_count)
      });
    });

    return Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Social Analytics</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalPosts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Likes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalLikes}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Reposts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalReposts}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Engagement Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.engagementRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Audience</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Followers</span>
                <span className="font-bold text-gray-900">{analytics.followers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Following</span>
                <span className="font-bold text-gray-900">{analytics.following}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ratio</span>
                <span className="font-bold text-gray-900">
                  {analytics.following > 0 ? (analytics.followers / analytics.following).toFixed(2) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Activity Over Time</h3>
            <div className="h-64 flex items-end justify-between gap-1">
              {analytics.activityByDay.map((day, index) => {
                const maxEngagement = Math.max(...analytics.activityByDay.map(d => d.engagement));
                const height = maxEngagement > 0 ? (day.engagement / maxEngagement) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.posts} posts, ${day.engagement} engagements`}
                    />
                    <div className="absolute bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded p-2 pointer-events-none -translate-y-full mb-2">
                      <p>{new Date(day.date).toLocaleDateString()}</p>
                      <p>{day.posts} posts</p>
                      <p>{day.engagement} engagements</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Posts</h3>
          <div className="space-y-4">
            {analytics.topPosts.map((post, index) => (
              <div key={post.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 mb-2">{post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {post.reposts_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {post.comments_count}
                    </span>
                    <span className="ml-auto text-xs">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
