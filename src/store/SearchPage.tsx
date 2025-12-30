import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Input } from '../components/atoms';
import { Card } from '../components/molecules';
import { ProductCard } from '../components/molecules/ProductCard';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

interface SearchPageProps {
  dataStore: any;
  onNavigate: (path: string) => void;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category?: string;
  stock?: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'food', label: 'Food & Beverage' },
  { id: 'home', label: 'Home & Garden' },
  { id: 'sports', label: 'Sports & Outdoors' },
  { id: 'beauty', label: 'Beauty & Personal Care' },
];

export function SearchPage({ dataStore, onNavigate }: SearchPageProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadProducts();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      const allProducts = await dataStore.listProducts?.() || [];
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    }
  };

  const loadRecentSearches = () => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  };

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      saveRecentSearch(query);
    } else {
      setIsSearching(false);
    }
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    saveRecentSearch(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleProductClick = (productId: string) => {
    navigate(`/store/product/${productId}`);
  };

  return (
    <Box style={{ minHeight: '100vh', background: colors.background.primary, paddingBottom: '100px' }}>
      <Box style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
        {/* Search Header */}
        <Box style={{ marginBottom: spacing['3xl'] }}>
          <Typography
            variant="h1"
            style={{
              marginBottom: spacing.lg,
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
            }}
          >
            Search Products
          </Typography>

          {/* Search Input */}
          <Box style={{ position: 'relative', marginBottom: spacing.xl }}>
            <Input
              type="text"
              placeholder="Search for products, categories, or brands..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: `${spacing.lg} ${spacing['3xl']} ${spacing.lg} ${spacing.lg}`,
                fontSize: typography.fontSize.lg,
                borderRadius: borderRadius.xl,
                border: `2px solid ${colors.border.primary}`,
                background: colors.background.secondary,
                color: colors.text.primary,
              }}
            />
            <Box
              style={{
                position: 'absolute',
                right: spacing.lg,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: typography.fontSize.xl,
                color: colors.text.secondary,
              }}
            >
              🔍
            </Box>
          </Box>

          {/* Category Filters */}
          <Box
            style={{
              display: 'flex',
              gap: spacing.sm,
              flexWrap: 'wrap',
              marginBottom: spacing.xl,
            }}
          >
            {CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  fontSize: typography.fontSize.sm,
                  borderRadius: borderRadius.full,
                  whiteSpace: 'nowrap',
                }}
              >
                {category.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Recent Searches (shown when not searching) */}
        {!isSearching && recentSearches.length > 0 && (
          <Box style={{ marginBottom: spacing['3xl'] }}>
            <Box
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Typography
                variant="h3"
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                Recent Searches
              </Typography>
              <Button
                variant="ghost"
                size="small"
                onClick={clearRecentSearches}
                style={{ fontSize: typography.fontSize.sm }}
              >
                Clear All
              </Button>
            </Box>
            <Box style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="secondary"
                  size="small"
                  onClick={() => handleRecentSearchClick(search)}
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    fontSize: typography.fontSize.sm,
                    borderRadius: borderRadius.full,
                  }}
                >
                  🕐 {search}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Search Results */}
        {filteredProducts.length > 0 ? (
          <Box>
            <Typography
              variant="h3"
              style={{
                marginBottom: spacing.xl,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {isSearching
                ? `Found ${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''}`
                : 'All Products'}
            </Typography>
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: spacing.xl,
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product.id)}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Card variant="outlined" style={{ padding: spacing['4xl'], textAlign: 'center' }}>
            <Box
              style={{
                fontSize: '64px',
                marginBottom: spacing.xl,
                opacity: 0.5,
              }}
            >
              🔍
            </Box>
            <Typography
              variant="h3"
              style={{
                marginBottom: spacing.md,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {isSearching ? 'No products found' : 'Start searching'}
            </Typography>
            <Typography
              variant="body"
              color="secondary"
              style={{
                marginBottom: spacing.xl,
                fontSize: typography.fontSize.base,
              }}
            >
              {isSearching
                ? 'Try adjusting your search or filters'
                : 'Search for products by name, category, or brand'}
            </Typography>
            {isSearching && (
              <Button
                variant="primary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setIsSearching(false);
                }}
                style={{
                  padding: `${spacing.md} ${spacing['2xl']}`,
                  fontSize: typography.fontSize.base,
                  borderRadius: borderRadius.lg,
                }}
              >
                Clear Search
              </Button>
            )}
          </Card>
        )}
      </Box>
    </Box>
  );
}
