import React, { useState } from 'react';
import type { Post } from '../../data/types';
import { useAuth } from '../../context/AuthContext';

interface PostCardProps {
  post: Post;
  onLike: (isLiked: boolean) => void;
  onRepost: (comment?: string) => void;
  onDelete: () => void;
}

export function PostCard({ post, onLike, onRepost, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostComment, setRepostComment] = useState('');

  const isOwnPost = user?.id === post.user_id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const handleRepost = () => {
    onRepost(repostComment || undefined);
    setShowRepostModal(false);
    setRepostComment('');
  };

  return (
    <div className="bg-white border-b hover:bg-gray-50 transition-colors">
      <div className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            {post.user?.photo_url ? (
              <img
                src={post.user.photo_url}
                alt={post.user.name || 'User'}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {(post.user?.name?.[0] || post.user?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 hover:underline cursor-pointer">
                {post.user?.name || post.user?.username || 'Unknown User'}
              </span>
              {post.user?.username && (
                <span className="text-gray-500">@{post.user.username}</span>
              )}
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">{formatDate(post.created_at)}</span>

              {isOwnPost && (
                <button
                  onClick={onDelete}
                  className="ml-auto text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete post"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-1">
              <p className="text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
            </div>

            {post.media && post.media.length > 0 && (
              <div className={`mt-3 grid gap-2 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {post.media.map((media, index) => (
                  <div key={media.id || index} className="rounded-2xl overflow-hidden">
                    {media.media_type === 'image' ? (
                      <img
                        src={media.media_url}
                        alt="Post media"
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    ) : media.media_type === 'video' ? (
                      <video
                        src={media.media_url}
                        controls
                        className="w-full h-auto max-h-96"
                        poster={media.thumbnail_url}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-8 mt-3 text-gray-500">
              <button className="flex items-center gap-2 hover:text-blue-500 transition-colors group">
                <svg className="w-5 h-5 group-hover:bg-blue-50 rounded-full p-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm">{post.comments_count || 0}</span>
              </button>

              <button
                onClick={() => setShowRepostModal(true)}
                className={`flex items-center gap-2 transition-colors group ${
                  post.is_reposted ? 'text-green-600' : 'hover:text-green-500'
                }`}
              >
                <svg className="w-5 h-5 group-hover:bg-green-50 rounded-full p-1 transition-colors" fill={post.is_reposted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">{post.reposts_count || 0}</span>
              </button>

              <button
                onClick={() => onLike(!!post.is_liked)}
                className={`flex items-center gap-2 transition-colors group ${
                  post.is_liked ? 'text-red-600' : 'hover:text-red-500'
                }`}
              >
                <svg className="w-5 h-5 group-hover:bg-red-50 rounded-full p-1 transition-colors" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm">{post.likes_count || 0}</span>
              </button>

              <button className="flex items-center gap-2 hover:text-blue-500 transition-colors group">
                <svg className="w-5 h-5 group-hover:bg-blue-50 rounded-full p-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRepostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Repost</h3>
              <button
                onClick={() => setShowRepostModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              value={repostComment}
              onChange={(e) => setRepostComment(e.target.value)}
              placeholder="Add a comment (optional)"
              className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />

            <div className="bg-gray-50 rounded-lg p-3 mt-3 border">
              <div className="flex gap-2">
                <div className="flex-shrink-0">
                  {post.user?.photo_url ? (
                    <img src={post.user.photo_url} alt={post.user.name || 'User'} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                      {(post.user?.name?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{post.user?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-700 mt-1">{post.content}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRepostModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRepost}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-colors"
              >
                Repost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
