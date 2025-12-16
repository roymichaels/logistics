import React, { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, X, TrendingUp, Clock } from 'lucide-react';
import type { Product } from '../data/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import { PageContent } from '../components/molecules/PageContent';
import { ProductCard } from '../components/molecules/ProductCard';
import { EmptyState } from '../components/molecules/EmptyState';
import { LoadingState } from '../components/molecules/LoadingState';
import { Grid } from '../components/atoms/Grid';
import { Chip } from '../components/atoms/Chip';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Card } from '../components/molecules/Card';
import { Text } from '../components/atoms/Typography';
import { colors, spacing } from '../styles/design-system';

type SearchPageProps = {
  dataStore?: any;
  onNavigate?: (path: string) => void;
};

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

const POPULAR_SEARCHES = [
  'Security',
  'Privacy',
  'Hardware',
  'Software',
  'Encryption',
  'Mobile',
];

const CATEGORIES = [
  'All Categories',
  'Electronics',
  'Security',
  'Privacy',
  'Hardware',
  'Software',
];

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ₪100', min: 0, max: 100 },
  { label: '₪100 - ₪500', min: 100, max: 500 },
  { label: '₪500 - ₪1000', min: 500, max: 1000 },
  { label: 'Over ₪1000', min: 1000, max: Infinity },
];

export function SearchPageNew({ dataStore, onNavigate }: SearchPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [activePriceRange, setActivePriceRange] = useState(PRICE_RANGES[0]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { setTitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();

  useEffect(() => {
    setTitle('Search');
  }, [setTitle]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery.trim()) {
        addToRecentSearches(searchQuery.trim());
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load products
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (sandbox.active) {
      setProducts((sandbox.sandbox.products as unknown as Product[]) || []);
      setLoading(false);
      return;
    }

    if (dataStore?.listProducts) {
      dataStore
        .listProducts()
        .then((list: Product[]) => {
          if (!cancelled) {
            setProducts(list || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setProducts([]);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [dataStore, sandbox.active]);

  const addToRecentSearches = (query: string) => {
    setRecentSearches((prev) => {
      const updated = [query, ...prev.filter((s) => s !== query)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  const handlePopularSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by search query
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'All Categories') {
      result = result.filter((p) => p.category === activeCategory);
    }

    // Filter by price range
    if (activePriceRange.label !== 'All Prices') {
      result = result.filter(
        (p) =>
          p.price !== undefined &&
          p.price >= activePriceRange.min &&
          p.price <= activePriceRange.max
      );
    }

    return result;
  }, [products, debouncedQuery, activeCategory, activePriceRange]);

  const handleProductClick = (product: Product) => {
    if (onNavigate) {
      onNavigate(`/store/product/${product.id}`);
    }
    nav.push('product', { product });
  };

  const hasSearched = debouncedQuery.trim().length > 0;
  const showResults = hasSearched || activeCategory !== 'All Categories' || activePriceRange.label !== 'All Prices';

  return (
    <>
      {/* Search Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: colors.background.primary,
          borderBottom: `1px solid ${colors.border.primary}`,
          padding: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('/store/catalog')}
              style={{ flexShrink: 0 }}
            >
              <X size={20} />
            </Button>
          )}

          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products..."
              autoFocus
              leftIcon={<SearchIcon size={18} />}
              rightIcon={
                searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: spacing.xs,
                      color: colors.text.secondary,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                ) : null
              }
              fullWidth
            />
          </div>
        </div>
      </div>

      <PageContent>
        {!showResults ? (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div style={{ marginBottom: spacing.xl }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <Clock size={18} color={colors.text.secondary} />
                    <Text variant="h4" weight="semibold">
                      Recent Searches
                    </Text>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                    Clear
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  {recentSearches.map((query, index) => (
                    <Card
                      key={index}
                      hoverable
                      interactive
                      onClick={() => handleRecentSearchClick(query)}
                      style={{
                        padding: spacing.md,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <SearchIcon size={16} color={colors.text.secondary} />
                        <Text>{query}</Text>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div style={{ marginBottom: spacing.xl }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <TrendingUp size={18} color={colors.text.secondary} />
                <Text variant="h4" weight="semibold">
                  Popular Searches
                </Text>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
              >
                {POPULAR_SEARCHES.map((query) => (
                  <Chip
                    key={query}
                    label={query}
                    onClick={() => handlePopularSearchClick(query)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Filters */}
            <div style={{ marginBottom: spacing.lg }}>
              <Text variant="small" weight="semibold" style={{ marginBottom: spacing.sm, display: 'block' }}>
                Category
              </Text>
              <div
                style={{
                  display: 'flex',
                  gap: spacing.sm,
                  overflowX: 'auto',
                  paddingBottom: spacing.sm,
                }}
              >
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    active={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: spacing.xl }}>
              <Text variant="small" weight="semibold" style={{ marginBottom: spacing.sm, display: 'block' }}>
                Price Range
              </Text>
              <div
                style={{
                  display: 'flex',
                  gap: spacing.sm,
                  overflowX: 'auto',
                  paddingBottom: spacing.sm,
                }}
              >
                {PRICE_RANGES.map((range) => (
                  <Chip
                    key={range.label}
                    label={range.label}
                    active={activePriceRange.label === range.label}
                    onClick={() => setActivePriceRange(range)}
                  />
                ))}
              </div>
            </div>

            {/* Results */}
            <div style={{ marginBottom: spacing.md }}>
              <Text variant="body" color="secondary">
                {loading
                  ? 'Searching...'
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'result' : 'results'} found`}
              </Text>
            </div>

            {loading ? (
              <LoadingState message="Searching products..." />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                title="No results found"
                description={`No products match your search for "${debouncedQuery}". Try different keywords or filters.`}
                action={{
                  label: 'Clear all filters',
                  onClick: () => {
                    setSearchQuery('');
                    setActiveCategory('All Categories');
                    setActivePriceRange(PRICE_RANGES[0]);
                  },
                }}
              />
            ) : (
              <Grid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap={spacing.md}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={handleProductClick}
                    variant="compact"
                  />
                ))}
              </Grid>
            )}
          </>
        )}
      </PageContent>
    </>
  );
}

export default SearchPageNew;
