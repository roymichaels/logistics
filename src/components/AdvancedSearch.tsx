import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { logger } from '../lib/logger';

interface AdvancedSearchProps {
  dataStore: DataStore;
  theme: any;
  onResults: (results: any[], type: string) => void;
  onClose: () => void;
}

interface SearchFilters {
  query: string;
  type: 'orders' | 'products' | 'tasks' | 'all';
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  assignedTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function AdvancedSearch({ dataStore, theme, onResults, onClose }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all'
  });
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (filters.query.length >= 2) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [filters.query]);

  const loadUsers = async () => {
    try {
      // This would typically be a separate API call to get all users
      // For now, we'll use the current user as a placeholder
      const profile = await dataStore.getProfile();
      setUsers([profile]);
    } catch (error) {
      logger.error('Failed to load users:', error);
    }
  };

  const loadSearchHistory = () => {
    const history = localStorage.getItem('search_history');
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 5));
    }
  };

  const saveToHistory = (query: string) => {
    const history = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
    setSearchHistory(history);
    localStorage.setItem('search_history', JSON.stringify(history));
  };

  const generateSuggestions = () => {
    // Generate search suggestions based on query
    const query = filters.query.toLowerCase();
    const suggestions = [
      'הזמנות חדשות',
      'משימות דחופות',
      'מוצרים במלאי נמוך',
      'הזמנות השבוע',
      'משימות שהושלמו',
      'לקוחות VIP'
    ].filter(s => s.toLowerCase().includes(query)).slice(0, 3);

    setSuggestions(suggestions);
  };

  const handleSearch = async () => {
    if (!filters.query.trim() && filters.type === 'all') return;

    setIsSearching(true);
    try {
      let results: any[] = [];

      if (filters.type === 'orders' || filters.type === 'all') {
        const orders = await searchOrders();
        results = [...results, ...orders.map(o => ({ ...o, _type: 'order' }))];
      }

      if (filters.type === 'products' || filters.type === 'all') {
        const products = await searchProducts();
        results = [...results, ...products.map(p => ({ ...p, _type: 'product' }))];
      }

      if (filters.type === 'tasks' || filters.type === 'all') {
        const tasks = await searchTasks();
        results = [...results, ...tasks.map(t => ({ ...t, _type: 'task' }))];
      }

      // Sort results by relevance/date
      results.sort((a, b) => {
        const aDate = new Date(a.created_at || a.updated_at || 0);
        const bDate = new Date(b.created_at || b.updated_at || 0);
        return bDate.getTime() - aDate.getTime();
      });

      onResults(results, filters.type);

      if (filters.query.trim()) {
        saveToHistory(filters.query);
      }
    } catch (error) {
      logger.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const searchOrders = async () => {
    if (!dataStore.listOrders) return [];

    const searchFilters: any = {
      q: filters.query,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      assignedDriver: filters.assignedTo,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };

    return dataStore.listOrders(searchFilters);
  };

  const searchProducts = async () => {
    if (!dataStore.listProducts) return [];

    return dataStore.listProducts({
      q: filters.query,
      category: filters.category
    });
  };

  const searchTasks = async () => {
    if (!dataStore.listAllTasks) return [];

    const allTasks = await dataStore.listAllTasks();

    return allTasks.filter(task => {
      const matchesQuery = !filters.query ||
        task.title.toLowerCase().includes(filters.query.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.query.toLowerCase());

      const matchesStatus = !filters.status || task.status === filters.status;
      const matchesAssignedTo = !filters.assignedTo || task.assigned_to === filters.assignedTo;

      return matchesQuery && matchesStatus && matchesAssignedTo;
    });
  };

  const handleQuickSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    // Auto-trigger search for quick actions
    setTimeout(() => handleSearch(), 100);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.bg_color,
      zIndex: 1000,
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${theme.hint_color}20`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: theme.text_color,
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: theme.text_color }}>
          🔍 חיפוש מתקדם
        </h2>
      </div>

      <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100vh - 80px)' }}>
        {/* Main Search Input */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="חפש הזמנות, מוצרים, משימות..."
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            style={{
              width: '100%',
              padding: '14px',
              border: `2px solid ${theme.button_color}40`,
              borderRadius: '12px',
              backgroundColor: theme.secondary_bg_color,
              color: theme.text_color,
              fontSize: '16px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Search Type Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { key: 'all', label: 'הכל', icon: '🔍' },
            { key: 'orders', label: 'הזמנות', icon: '📋' },
            { key: 'products', label: 'מוצרים', icon: '📦' },
            { key: 'tasks', label: 'משימות', icon: '✅' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilters(prev => ({ ...prev, type: key as any }))}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: filters.type === key ? theme.button_color : theme.secondary_bg_color,
                color: filters.type === key ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: theme.hint_color }}>
              הצעות
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(suggestion)}
                  style={{
                    padding: '6px 12px',
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '16px',
                    backgroundColor: 'transparent',
                    color: theme.text_color,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && !filters.query && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: theme.hint_color }}>
              חיפושים אחרונים
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {searchHistory.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(query)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: theme.secondary_bg_color,
                    color: theme.text_color,
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'right'
                  }}
                >
                  🕐 {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
            מסננים מתקדמים
          </h4>

          {/* Date Range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                מתאריך
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '8px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                עד תאריך
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '8px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          {(filters.type === 'orders' || filters.type === 'tasks' || filters.type === 'all') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                סטטוס
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '8px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              >
                <option value="">כל הסטטוסים</option>
                <option value="new">חדש</option>
                <option value="confirmed">אושר</option>
                <option value="preparing">בהכנה</option>
                <option value="ready">מוכן</option>
                <option value="out_for_delivery">יצא למשלוח</option>
                <option value="delivered">נמסר</option>
                <option value="cancelled">בוטל</option>
              </select>
            </div>
          )}

          {/* Amount Range (for orders) */}
          {(filters.type === 'orders' || filters.type === 'all') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                  סכום מינימלי (₪)
                </label>
                <input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '8px',
                    backgroundColor: theme.secondary_bg_color,
                    color: theme.text_color
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                  סכום מקסימלי (₪)
                </label>
                <input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '8px',
                    backgroundColor: theme.secondary_bg_color,
                    color: theme.text_color
                  }}
                />
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                מיין לפי
              </label>
              <select
                value={filters.sortBy || 'created_at'}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '8px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              >
                <option value="created_at">תאריך יצירה</option>
                <option value="updated_at">תאריך עדכון</option>
                <option value="total_amount">סכום</option>
                <option value="status">סטטוס</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: theme.text_color }}>
                סדר
              </label>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '8px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              >
                <option value="desc">יורד</option>
                <option value="asc">עולה</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              opacity: isSearching ? 0.7 : 1
            }}
          >
            {isSearching ? 'מחפש...' : '🔍 חפש'}
          </button>

          <button
            onClick={() => setFilters({ query: '', type: 'all' })}
            style={{
              padding: '14px 20px',
              backgroundColor: 'transparent',
              color: theme.text_color,
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '12px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            נקה
          </button>
        </div>
      </div>
    </div>
  );
}