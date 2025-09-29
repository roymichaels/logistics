import React, { useState, useEffect } from 'react';
import { telegram } from './lib/telegram';
import { bootstrap, setUserMode } from './src/lib/bootstrap';
import { createStore } from './data';
import { DataStore, BootstrapConfig } from './data/types';
import { ModeBadge } from './src/components/ModeBadge';
import { Lobby } from './src/pages/Lobby';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';

type Page = 'lobby' | 'dashboard' | 'orders' | 'tasks' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('lobby');
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'demo' | 'real' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const theme = telegram.themeParams;

  useEffect(() => {
    initializeApp();
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.style.backgroundColor = theme.bg_color || '#ffffff';
    document.body.style.color = theme.text_color || '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }, [theme]);

  const initializeApp = async () => {
    try {
      // Bootstrap from server
      const result = await bootstrap();
      setConfig(result.config);
      setToken(result.token);
      
      // Check if user has a saved preference
      if (result.prefMode) {
        // User has a preference, skip lobby
        await handleModeSelected(result.prefMode, false);
      } else {
        // Show lobby for mode selection
        setCurrentPage('lobby');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize app');
      setLoading(false);
    }
  };

  const handleModeSelected = async (selectedMode: 'demo' | 'real', remember: boolean) => {
    if (!config) return;
    
    try {
      // Set user preference if remember is true
      if (remember && token) {
        await setUserMode(token, selectedMode);
      }
      
      // Create data store with selected mode
      const store = await createStore(config, selectedMode);
      setDataStore(store);
      setMode(selectedMode);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Failed to set mode:', error);
      throw error;
    }
  };

  const handleNavigate = (page: Page) => {
    if (page === 'lobby') {
      setMode(null);
      setDataStore(null);
    }
    setCurrentPage(page);
    telegram.hapticFeedback('selection');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        fontSize: '16px'
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️ Error</h1>
        <p style={{ fontSize: '16px', marginBottom: '24px' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.button_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const renderPage = () => {
    if (currentPage === 'lobby') {
      return (
        <Lobby 
          onModeSelected={handleModeSelected}
          defaultMode={config?.defaults?.mode}
        />
      );
    }
    
    if (!dataStore) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: theme.bg_color,
          color: theme.text_color,
          fontSize: '16px'
        }}>
          Setting up workspace...
        </div>
      );
    }

    switch (currentPage) {
      case 'orders':
        return <Orders dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'tasks':
        return <Tasks dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings dataStore={dataStore} onNavigate={handleNavigate} mode={mode} config={config} />;
      default:
        return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg_color,
      color: theme.text_color
    }}>
      {mode && config && (
        <ModeBadge 
          mode={mode} 
          adapter={config.adapters.data}
        />
      )}
      {renderPage()}
    </div>
  );
}