import { useMemo, useState } from 'react';

export function useSearchAndFilter(products: any[]) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredResults = useMemo(() => {
    let result = products || [];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          (p?.name && p.name.toLowerCase().includes(q)) ||
          (p?.description && p.description.toLowerCase().includes(q))
      );
    }

    switch (activeFilter) {
      case 'New':
        result = [...result].sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));
        break;
      case 'Popular':
        result = [...result].sort((a, b) => (b?.popularity || b?.rating || 0) - (a?.popularity || a?.rating || 0));
        break;
      case 'Price ↑':
        result = [...result].sort((a, b) => (a?.price || 0) - (b?.price || 0));
        break;
      case 'Price ↓':
        result = [...result].sort((a, b) => (b?.price || 0) - (a?.price || 0));
        break;
      case 'All':
      default:
        break;
    }

    return result;
  }, [products, query, activeFilter]);

  return { filteredResults, query, setQuery, activeFilter, setActiveFilter };
}

export default useSearchAndFilter;
