import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'TELEGRAMX_REACTION_STORE';
const DEBOUNCE_MS = 200;

type ReactionState = {
  wishlist: Set<string>;
  likes: Set<string>;
  seen: Set<string>;
};

export function useReactionStore() {
  const [state, setState] = useState<ReactionState>(() => {
    if (typeof window === 'undefined') {
      return { wishlist: new Set(), likes: new Set(), seen: new Set() };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { wishlist: new Set(), likes: new Set(), seen: new Set() };
      const parsed = JSON.parse(raw);
      return {
        wishlist: new Set(parsed.wishlist || []),
        likes: new Set(parsed.likes || []),
        seen: new Set(parsed.seen || [])
      };
    } catch {
      return { wishlist: new Set(), likes: new Set(), seen: new Set() };
    }
  });

  const debounceRef = useRef<number | null>(null);

  const persist = (next: ReactionState) => {
    if (typeof window === 'undefined') return;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      const payload = {
        wishlist: Array.from(next.wishlist),
        likes: Array.from(next.likes),
        seen: Array.from(next.seen)
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }, DEBOUNCE_MS);
  };

  const toggleWishlist = (id: string) => {
    setState((prev) => {
      const wishlist = new Set(prev.wishlist);
      wishlist.has(id) ? wishlist.delete(id) : wishlist.add(id);
      const next = { ...prev, wishlist };
      persist(next);
      return next;
    });
  };

  const toggleLike = (id: string) => {
    setState((prev) => {
      const likes = new Set(prev.likes);
      likes.has(id) ? likes.delete(id) : likes.add(id);
      const next = { ...prev, likes };
      persist(next);
      return next;
    });
  };

  const markSeen = (id: string) => {
    setState((prev) => {
      if (prev.seen.has(id)) return prev;
      const seen = new Set(prev.seen);
      seen.add(id);
      const next = { ...prev, seen };
      persist(next);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    wishlist: state.wishlist,
    likes: state.likes,
    seen: state.seen,
    toggleWishlist,
    toggleLike,
    markSeen
  };
}

export default useReactionStore;
