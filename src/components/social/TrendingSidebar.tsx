import React, { useEffect, useState } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import type { TrendingTopic, User } from '../../data/types';

export function TrendingSidebar() {
  const { dataStore } = useAppServices();
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      setLoading(true);
      const [trendingData, usersData] = await Promise.all([
        dataStore.getTrendingTopics?.(10) || Promise.resolve([]),
        dataStore.searchUsers?.('', 5) || Promise.resolve([])
      ]);
      setTrending(trendingData);
      setSuggestedUsers(usersData);
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await dataStore.followUser?.(userId);
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-2xl overflow-hidden">
        <div className="p-4">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-4 py-2 bg-white border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Trending</h2>
        </div>

        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : trending.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No trending topics yet
          </div>
        ) : (
          <div>
            {trending.map((topic, index) => (
              <div
                key={topic.id}
                className="p-4 hover:bg-gray-100 transition-colors cursor-pointer border-b border-gray-200 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">
                      {index + 1} · Trending
                    </p>
                    <p className="font-bold text-gray-900">
                      #{topic.hashtag?.tag}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {topic.posts_count} {topic.posts_count === 1 ? 'post' : 'posts'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-gray-200">
          <button className="text-blue-500 hover:underline text-sm">
            Show more
          </button>
        </div>
      </div>

      {suggestedUsers.length > 0 && (
        <div className="bg-gray-50 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Who to follow</h2>
          </div>

          <div>
            {suggestedUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {user.photo_url ? (
                      <img
                        src={user.photo_url}
                        alt={user.name || 'User'}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {(user.name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate hover:underline cursor-pointer">
                      {user.name || user.username || 'Unknown'}
                    </p>
                    {user.username && (
                      <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleFollow(user.id)}
                    className="px-4 py-1.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Follow
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <button className="text-blue-500 hover:underline text-sm">
              Show more
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 px-4 space-x-2">
        <a href="#" className="hover:underline">Terms of Service</a>
        <a href="#" className="hover:underline">Privacy Policy</a>
        <a href="#" className="hover:underline">Cookie Policy</a>
        <a href="#" className="hover:underline">Accessibility</a>
        <a href="#" className="hover:underline">Ads info</a>
        <p className="mt-2">© 2025 Social Platform</p>
      </div>
    </div>
  );
}
