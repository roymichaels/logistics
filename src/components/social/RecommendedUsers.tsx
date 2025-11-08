import React, { useEffect, useState } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { i18n } from '../../lib/i18n';

interface RecommendedUser {
  id: string;
  username: string;
  name: string;
  photo_url?: string;
  recommendation_score: number;
  mutual_followers_count: number;
  reason: string;
}

interface RecommendedUsersProps {
  limit?: number;
  onFollow?: (userId: string) => void;
  onDismiss?: (userId: string) => void;
}

export function RecommendedUsers({ limit = 5, onFollow, onDismiss }: RecommendedUsersProps) {
  const { dataStore } = useAppServices();
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedUsers, setDismissedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call database function to get personalized recommendations
      const { data, error: queryError } = await dataStore.supabase
        .rpc('get_user_recommendations', {
          target_user_id: (await dataStore.supabase.auth.getUser()).data.user?.id,
          limit_count: limit
        });

      if (queryError) throw queryError;
      setRecommendedUsers(data || []);
    } catch (err) {
      logger.error('Failed to load recommendations:', err);
      setError(i18n.getTranslations().social.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await dataStore.followUser?.(userId);
      setRecommendedUsers(prev => prev.filter(u => u.id !== userId));
      if (onFollow) onFollow(userId);
    } catch (err) {
      logger.error('Failed to follow user:', err);
    }
  };

  const handleDismiss = async (userId: string) => {
    try {
      // Mark as dismissed in the database
      await dataStore.supabase
        .from('user_recommendations')
        .update({ is_dismissed: true })
        .eq('user_id', (await dataStore.supabase.auth.getUser()).data.user?.id)
        .eq('recommended_user_id', userId);

      setDismissedUsers(prev => new Set([...prev, userId]));
      setRecommendedUsers(prev => prev.filter(u => u.id !== userId));
      if (onDismiss) onDismiss(userId);
    } catch (err) {
      logger.error('Failed to dismiss recommendation:', err);
    }
  };

  const handleNotInterested = async (userId: string) => {
    try {
      // Mark as not interested in the database
      await dataStore.supabase
        .from('user_recommendations')
        .update({ is_not_interested: true })
        .eq('user_id', (await dataStore.supabase.auth.getUser()).data.user?.id)
        .eq('recommended_user_id', userId);

      setRecommendedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      logger.error('Failed to mark as not interested:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-2xl overflow-hidden p-4">
        <h2 className="text-xl font-bold mb-4">{i18n.getTranslations().social.suggestedForYou}</h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 rounded-2xl overflow-hidden p-4">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={loadRecommendations}
          className="text-blue-500 hover:underline text-sm mt-2"
        >
          {i18n.getTranslations().social.tryAgain}
        </button>
      </div>
    );
  }

  if (recommendedUsers.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold">{i18n.getTranslations().social.suggestedForYou}</h2>
        <p className="text-xs text-gray-500 mt-1">{i18n.getTranslations().social.basedOnYourInterests}</p>
      </div>

      <div>
        {recommendedUsers.map((user) => (
          <div
            key={user.id}
            className="p-4 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name || user.username}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {(user.name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
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
                    className="ml-2 px-4 py-1.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
                    aria-label={`${i18n.getTranslations().social.follow} ${user.name || user.username}`}
                  >
                    {i18n.getTranslations().social.follow}
                  </button>
                </div>

                {user.mutual_followers_count > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {user.mutual_followers_count} {i18n.getTranslations().social.mutualFollowers}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1">{user.reason}</p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleDismiss(user.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                    aria-label={i18n.getTranslations().social.dismiss}
                  >
                    {i18n.getTranslations().social.dismiss}
                  </button>
                  <button
                    onClick={() => handleNotInterested(user.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                    aria-label={i18n.getTranslations().social.notInterested}
                  >
                    {i18n.getTranslations().social.notInterested}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendedUsers.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={loadRecommendations}
            className="text-blue-500 hover:underline text-sm"
            aria-label={i18n.getTranslations().social.showMore}
          >
            {i18n.getTranslations().social.showMore}
          </button>
        </div>
      )}
    </div>
  );
}
