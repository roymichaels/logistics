import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

// Handle Telegram WebApp lifecycle
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  
  // Initialize Telegram WebApp
  tg.ready();
  tg.expand();
  
  // Set theme colors
  if (tg.themeParams) {
    const root = document.documentElement;
    Object.entries(tg.themeParams).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
      }
    });
  }
  
  // Handle viewport changes
  const handleViewportChange = () => {
    const vh = tg.viewportStableHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  handleViewportChange();
  window.addEventListener('resize', handleViewportChange);
  
  // Handle theme changes
  tg.onEvent('themeChanged', () => {
    if (tg.themeParams) {
      const root = document.documentElement;
      Object.entries(tg.themeParams).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
        }
      });
    }
  });
}