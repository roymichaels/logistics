import { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import type { Post } from '../data/types';

export function useRealtimeFeed() {
  const { dataStore } = useAppServices();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataStore.supabase) return;

    const channel = dataStore.supabase
      .channel('posts-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload: any) => {
          const newPost = await enrichPostData(payload.new);
          setPosts((current) => [newPost, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        async (payload: any) => {
          const updatedPost = await enrichPostData(payload.new);
          setPosts((current) =>
            current.map((post) =>
              post.id === updatedPost.id ? updatedPost : post
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload: any) => {
          setPosts((current) =>
            current.filter((post) => post.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      dataStore.supabase.removeChannel(channel);
    };
  }, [dataStore.supabase]);

  const enrichPostData = async (postData: any): Promise<Post> => {
    const { data: userData } = await dataStore.supabase
      .from('users')
      .select('id, name, username, photo_url')
      .eq('id', postData.user_id)
      .single();

    const { data: mediaData } = await dataStore.supabase
      .from('post_media')
      .select('*')
      .eq('post_id', postData.id)
      .order('display_order');

    return {
      ...postData,
      user: userData,
      media: mediaData || [],
      is_liked: false,
      is_reposted: false,
      is_bookmarked: false
    };
  };

  return { posts, setPosts, loading, setLoading };
}
